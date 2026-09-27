import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { assessmentInput } from '../execution/assess.mjs';

// Host-only facade. No main-agent send, steer or execution handle is accepted.
export function createSidebarService({ctx,ledger,execution,chat,goals,sharedCandidates,runShared,coach,budget,supervisorUsage,observer,checkpoints,routes,inflight,workspacePath,bind,check,isActive,notifications,dismiss,cards,onCardDisposition,validationStatus}){
 ledger.db.exec(`CREATE TABLE IF NOT EXISTS sidebar_tasks(task TEXT PRIMARY KEY REFERENCES tasks(id));
 CREATE TABLE IF NOT EXISTS sidebar_authority(id INTEGER PRIMARY KEY CHECK(id=1),approved_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sidebar_projects(path TEXT PRIMARY KEY,enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sidebar_consents(session TEXT PRIMARY KEY,project TEXT NOT NULL,decision TEXT NOT NULL CHECK(decision IN ('accepted','declined')),updated INTEGER NOT NULL);`);
 ledger.db.exec('CREATE TABLE IF NOT EXISTS sidebar_shared_projects(path TEXT PRIMARY KEY,enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),updated INTEGER NOT NULL)');
 // Keep the existing model route while removing retired lifetime caps.
 const saved=budget.info();
 if(saved.configured){
  const legacyTimeout=saved.config.timeoutMs===60000&&saved.config.ttlMs===150000;
  if(saved.config.maxRequests!==null||saved.config.maxOutputTokens!==null||legacyTimeout)budget.approve({...saved.config,maxRequests:null,maxOutputTokens:null,...legacyTimeout?{timeoutMs:180000,ttlMs:390000}:{}});
 }
 const generations=new Map();
 const bump=task=>generations.set(task,(generations.get(task)??0)+1);
 const managed=task=>!!ledger.db.prepare('SELECT task FROM sidebar_tasks WHERE task=?').get(task);
 const taskFor=sessionId=>ledger.bindings().find(b=>b.sessionId===sessionId)?.taskId;
 const primary=session=>!!session&&!session.header.parentSession&&!session.header.origin&&!session.id.startsWith('taskwatch-check-');
 const projectPath=session=>{const path=session?.header.cwd??workspacePath;return typeof path==='string'&&path.trim()?resolve(path):null;};
 const eligible=session=>primary(session)&&projectPath(session)!==null;
 const formalUnderstanding=task=>{const intent=ledger.snapshot(task).current;return {goal:intent?.goal?.text??'等待明确当前任务',requirements:(intent?.requirements??[]).map(item=>item.text),constraints:(intent?.constraints??[]).map(item=>item.text)};};
 const hierarchy=(task,session)=>{const shared=goals.snapshot(projectPath(session),task),main=ledger.snapshot(task),side=chat.snapshot(task),base=side.basedOnMainVersion===main.version&&side.understanding?side.understanding:formalUnderstanding(task);return {project:shared.project,phase:shared.phase,phaseHistory:shared.phaseHistory,task:{mainIntentVersion:main.currentVersion,formalGoal:main.current?.goal?.text??null,formalRequirements:(main.current?.requirements??[]).map(item=>item.text),formalConstraints:(main.current?.constraints??[]).map(item=>item.text),supervisorRevision:side.version,supervisorOverlay:side.understanding,supervisorCurrent:side.basedOnMainVersion===main.version,editableItems:goals.taskItems(base)}};};
 const projectEnabled=session=>!!ledger.db.prepare('SELECT enabled FROM sidebar_projects WHERE path=?').get(projectPath(session))?.enabled;
 const sharedEnabled=project=>!!ledger.db.prepare('SELECT enabled FROM sidebar_shared_projects WHERE path=?').get(project)?.enabled;
 const decision=session=>{const row=ledger.db.prepare('SELECT project,decision FROM sidebar_consents WHERE session=?').get(session.id);return row?.project===projectPath(session)?row.decision:null;};
 const authorized=session=>eligible(session)&&projectEnabled(session)&&decision(session)==='accepted';
 const consentedTask=sessionId=>{if(!authorized(ctx.sessions.get(sessionId)))throw new Error('Project and task consent required');const task=taskFor(sessionId);if(!task||!managed(task))throw new Error('Unknown managed task');return task;};
 const route=()=>{const info=budget.info();if(!info.configured||!info.config.enabled)throw new Error('Not configured');return info.config;};
 const checked=async(task,category,options)=>{let result;try{result=await check(options);return result;}finally{try{supervisorUsage?.record(task,options.checkId,category,result);}catch{/* Telemetry must not change the check result. */}}};
 const cardRevision=task=>({mainVersion:ledger.snapshot(task).version,throughSeq:execution.snapshot(task).throughSeq,sideVersion:chat.snapshot(task).version});
 const recordDisposition=async(task,cardId,action,result)=>{if(typeof onCardDisposition!=='function')return;try{await onCardDisposition(task,cardId,action,result);}catch{/* A local candidate-capture failure never changes the user's card action. */}};
 function recover(task){
  const binding=ledger.bindings().find(b=>b.taskId===task);const session=binding&&ctx.sessions.get(binding.sessionId);
  if(session&&(ledger.snapshot(task).coverageGap==='history-unverified'||execution.snapshot(task).coverage.includes('history-unverified'))){ledger.reconcile(task,session);execution.reconcile(task,session);}
 }
 function start(task){
  const config=route();if(budget.isPaused(task))return;
  recover(task);routes.set(task,{...config});
  const status=observer.status(task);
  if(!status)observer.start(task,{...config,maxRequests:null,maxOutputTokens:null,initialDirty:false});
  else if(status.status==='paused'||status.status==='stopped')observer.resume(task,{maxRequests:null,maxOutputTokens:null,maxTokens:config.maxTokens,timeoutMs:config.timeoutMs,debounceMs:config.debounceMs,ttlMs:config.ttlMs,initialDirty:false});
  if(checkpoints.status(task).lastCheckedAt===null){
   const latest=notifications(task).at(-1),evidence=execution.snapshot(task);
   if(latest?.revision===JSON.stringify({version:evidence.inputVersion,throughSeq:evidence.throughSeq,coverage:evidence.coverage,sideVersion:chat.snapshot(task).version}))checkpoints.seedFromReport(task,latest.created);
  }
  checkpoints.restore(task);
 }
 function enable(sessionId){
  const session=ctx.sessions.get(sessionId);if(!authorized(session))throw new Error('Project and task consent required');route();
  let task=taskFor(sessionId);
  if(!task){task=`sidebar-${randomUUID()}`;bind(task,sessionId);}
  ledger.db.prepare('INSERT OR IGNORE INTO sidebar_tasks VALUES (?)').run(task);start(task);return task;
 }
 const api={
  managed,
  authorizedTask(task){const binding=ledger.bindings().find(b=>b.taskId===task),session=binding&&ctx.sessions.get(binding.sessionId);return !!session&&managed(task)&&authorized(session);},
  sharedEnabled,
  authorizedTasks(project){return ledger.bindings().filter(b=>{const session=ctx.sessions.get(b.sessionId);return session&&projectPath(session)===project&&managed(b.taskId)&&authorized(session)&&!budget.isPaused(b.taskId);}).map(b=>b.taskId);},
  onEvent(session,event){
   if(event.type!=='user/message'||event.data?.source?.kind!=='user'||!eligible(session))return;
   const info=budget.info();if(!info.configured||!info.config.enabled)return;
   if(!authorized(session))return;
   const existing=taskFor(session.id);
   if(existing){if(managed(existing)&&!budget.isPaused(existing))start(existing);return;}
   enable(session.id);
  },
  restore(){if(!budget.info().config?.enabled)return;for(const b of ledger.bindings())if(managed(b.taskId)&&authorized(ctx.sessions.get(b.sessionId)))start(b.taskId);},
  async state(sessionId){
   const selected=sessionId?ctx.sessions.get(sessionId):null;
   const approved=authorized(selected);let taskId=sessionId&&approved?taskFor(sessionId):null;let models=[];
   if(!taskId&&approved&&budget.info().config?.enabled&&selected.events.some(event=>event.type==='user/message'&&event.data?.source?.kind==='user'))taskId=enable(sessionId);
   if(taskId&&managed(taskId)&&approved&&budget.info().config?.enabled&&!budget.isPaused(taskId)&&!observer.status(taskId))start(taskId);
   try{models=(await ctx.llm.listModels('deepseek-official')).map(m=>({id:m.id,name:m.name??m.id}));}catch{}
   const global=budget.info();
   const status=taskId?(budget.isPaused(taskId)?{status:'paused'}:{...(observer.status(taskId)??{status:global.config?.enabled?'waiting':'disabled'})}):{status:'unbound'};
   if(taskId&&global.configured&&!global.config.enabled)status.status='disabled';
   const session=sessionId?ctx.sessions.get(sessionId):null;
   const consentStatus=!session?'no-session':!primary(session)?'not-primary':!eligible(session)?'project-disabled':!global.configured?'not-configured':!global.config.enabled?'global-disabled':!projectEnabled(session)?'project-disabled':decision(session)??'pending';
   const bindingReason=taskId?null:consentStatus;
   const currentCard=taskId&&cards?(cards.markStale(taskId,cardRevision(taskId)),cards.current(taskId)):null;
   const goalHierarchy=taskId&&session?hierarchy(taskId,session):null;const pendingDraft=taskId&&session?goals.currentPending(projectPath(session),taskId,{mainVersion:ledger.snapshot(taskId).version,sideVersion:chat.snapshot(taskId).version,throughSeq:execution.snapshot(taskId).throughSeq}):null;const currentUnderstanding=taskId?(chat.snapshot(taskId).understanding??formalUnderstanding(taskId)):null;const pendingGoalChange=pendingDraft&&session?{...pendingDraft,preview:goals.preview(projectPath(session),pendingDraft,{taskUnderstanding:currentUnderstanding})}:null;const goalHistory=taskId&&session?goals.history(projectPath(session)):[];const hasShared=goalHierarchy&&(goalHierarchy.project.version||goalHierarchy.phase.version);const goalDocument=hasShared?goals.document(projectPath(session)):null;
   return {sessionId,taskId:taskId??null,scope:workspacePath,sessionWorkspace:session?.header.cwd??null,project:eligible(session)?{path:projectPath(session),enabled:projectEnabled(session),sharedExtractionEnabled:sharedEnabled(projectPath(session))}:null,coach:eligible(session)&&coach?{project:coach.project(projectPath(session)),taskConsented:taskId?coach.consented(taskId):false,suggestions:taskId?coach.list(taskId):[]}:null,consent:{status:consentStatus},bindingReason,budget:global,supervisorUsage:supervisorUsage?{global:supervisorUsage.summary(),task:taskId?supervisorUsage.summary(taskId):null,recent:taskId?supervisorUsage.details(taskId):[]}:null,models,eligible:sessionId?eligible(ctx.sessions.get(sessionId)):false,status,checkpoint:taskId?checkpoints.status(taskId):null,goalHierarchy,pendingGoalChange,goalHistory,goalDocument,sharedGoalCandidates:eligible(session)&&sharedCandidates?sharedCandidates.list(projectPath(session)):[],
    executionHistory:taskId?execution.snapshot(taskId).history:null,
    intent:taskId?ledger.snapshot(taskId):null,chat:taskId?{...chat.snapshot(taskId),current:chat.snapshot(taskId).basedOnMainVersion===ledger.snapshot(taskId).version}:null,reports:taskId?notifications(taskId):[],card:currentCard,cardHistory:taskId&&cards?cards.list(taskId):[],...(taskId&&typeof validationStatus==='function'?{validationStatus:validationStatus(taskId)}:{})};
  },
  async configure(config){
   if(inflight.size)throw new Error('Wait for current requests before changing route');
   if(config&&Object.keys(config).length===3&&['provider','model','enabled'].every(key=>key in config))config={...config,maxRequests:null,maxOutputTokens:null,maxTokens:3072,timeoutMs:180000,debounceMs:750,ttlMs:390000};
   const result=budget.approve(config);
   ledger.db.prepare('INSERT OR IGNORE INTO sidebar_authority VALUES (1,?)').run(Date.now());

   for(const b of ledger.bindings())if(managed(b.taskId)){bump(b.taskId);checkpoints.pause(b.taskId);observer.stop(b.taskId);}
   if(config.enabled)api.restore();return result;
  },
  async enableProject(sessionId){
   const session=ctx.sessions.get(sessionId);if(!eligible(session))throw new Error('Only main sessions have a project');route();
   ledger.db.prepare('INSERT INTO sidebar_projects VALUES (?,1,?) ON CONFLICT(path) DO UPDATE SET enabled=1,updated=excluded.updated').run(projectPath(session),Date.now());
   api.restore();return api.state(sessionId);
  },
  async enableSharedExtraction(sessionId,enabled){const session=ctx.sessions.get(sessionId);if(!eligible(session)||!projectEnabled(session)||typeof enabled!=='boolean')throw new Error('Enabled project required');ledger.db.prepare('INSERT INTO sidebar_shared_projects VALUES (?,?,?) ON CONFLICT(path) DO UPDATE SET enabled=excluded.enabled,updated=excluded.updated').run(projectPath(session),Number(enabled),Date.now());return api.state(sessionId);},
  async scanSharedExtraction(sessionId){consentedTask(sessionId);const session=ctx.sessions.get(sessionId),tasks=api.authorizedTasks(projectPath(session));const materials=tasks.map(id=>{const snapshot=ledger.snapshot(id),sources=snapshot.messages.filter(message=>message.complete).map(message=>({messageId:message.id,time:message.time,text:message.text}));return {taskId:id,intentVersion:snapshot.version,formalGoal:snapshot.current?.goal?.text??null,messageCount:snapshot.messages.length,knownTimeCount:sources.filter(message=>message.time!==null).length,sources};});return {project:projectPath(session),tasks:materials,estimatedLayerCalls:materials.length?2:0,estimatedSourceBytes:Buffer.byteLength(JSON.stringify(materials)),model:route().model,note:'实际调用数可能因长输入分窗增加；扫描本身不调用模型。'};},
  async runSharedExtraction(sessionId){consentedTask(sessionId);const session=ctx.sessions.get(sessionId),project=projectPath(session);if(!sharedEnabled(project))throw new Error('Shared extraction is disabled');return runShared(project);},
  async confirmSharedCandidate(sessionId,id){consentedTask(sessionId);const session=ctx.sessions.get(sessionId),project=projectPath(session),candidate=sharedCandidates.get(project,id);if(!candidate)throw new Error('Unknown shared candidate');const result=sharedCandidates.confirm(project,id);if(result.status==='confirmed')for(const task of api.authorizedTasks(project))checkpoints.sideUpdated(task);return result;},
  async dismissSharedCandidate(sessionId,id){consentedTask(sessionId);return {status:sharedCandidates.dismiss(projectPath(ctx.sessions.get(sessionId)),id)?'dismissed':'stale'};},
  async disableProject(sessionId){
   const session=ctx.sessions.get(sessionId);if(!eligible(session))throw new Error('Only main sessions have a project');
   ledger.db.prepare('INSERT INTO sidebar_projects VALUES (?,0,?) ON CONFLICT(path) DO UPDATE SET enabled=0,updated=excluded.updated').run(projectPath(session),Date.now());
   coach?.setProject(projectPath(session),false);
   for(const b of ledger.bindings()){const bound=ctx.sessions.get(b.sessionId);if(bound&&managed(b.taskId)&&projectPath(bound)===projectPath(session)){bump(b.taskId);checkpoints.pause(b.taskId);observer.stop(b.taskId);}}
   return api.state(sessionId);
  },
  async decide(sessionId,choice){
   const session=ctx.sessions.get(sessionId);if(!eligible(session)||!['accept','decline'].includes(choice))throw new Error('Invalid task decision');route();
   if(!projectEnabled(session))throw new Error('Enable current project first');
   if(decision(session))throw new Error('Task already decided');
   ledger.db.prepare('INSERT INTO sidebar_consents VALUES (?,?,?,?)').run(sessionId,projectPath(session),choice==='accept'?'accepted':'declined',Date.now());
   if(choice==='accept'){const task=enable(sessionId);if(coach?.project(projectPath(session)).enabled)coach.consent(task,projectPath(session));}
   return api.state(sessionId);
  },
  async setCoachProject(sessionId,enabled){const session=ctx.sessions.get(sessionId);if(!eligible(session)||!projectEnabled(session)||typeof enabled!=='boolean')throw new Error('Enabled project required');coach.setProject(projectPath(session),enabled);return api.state(sessionId);},
  async consentCoach(sessionId){const task=consentedTask(sessionId),session=ctx.sessions.get(sessionId);coach.consent(task,projectPath(session));return api.state(sessionId);},
  async sendCoach(sessionId,id){const task=consentedTask(sessionId);return coach.send(task,id,{approved:true});},
  async dismissCoach(sessionId,id){const task=consentedTask(sessionId);return {status:coach.dismiss(task,id)?'dismissed':'stale'};},
  async enable(sessionId){enable(sessionId);return api.state(sessionId);},
  async pause(sessionId){const task=consentedTask(sessionId);budget.setPaused(task,true);bump(task);checkpoints.pause(task);observer.stop(task);return api.state(sessionId);},
  async resume(sessionId){const task=consentedTask(sessionId);route();budget.setPaused(task,false);start(task);return api.state(sessionId);},
  async chat(sessionId,text,mode){
   const task=consentedTask(sessionId);
   if(budget.isPaused(task))return {status:'paused'};const config=route();
   if(inflight.has(task)||observer.status(task)?.status==='observing')return {status:'busy'};
   const generation=generations.get(task)??0;
   const valid=()=>generation===(generations.get(task)??0)&&isActive()&&!budget.isPaused(task)&&budget.info().config?.enabled&&authorized(ctx.sessions.get(sessionId));
   const executionState=execution.snapshot(task),{instruction:_,...evidence}=assessmentInput(executionState);
   const session=ctx.sessions.get(sessionId),goalHierarchy=hierarchy(task,session);const pending=chat.send(task,text,{kind:mode,route:config,isActive:valid,evidence:[evidence],goalHierarchy,prepareCorrection:({result,start})=>{const side=chat.snapshot(task),base=side.basedOnMainVersion===start.mainVersion&&side.understanding?side.understanding:formalUnderstanding(task);const proposal=goals.propose({project:projectPath(session),task,userText:start.userText,operations:result.operations,mainVersion:start.mainVersion,sideVersion:start.sideVersion,throughSeq:executionState.throughSeq,expectedProjectVersion:goalHierarchy.project.version,expectedPhaseVersion:goalHierarchy.phase.version,userMessageId:start.userMessage.id,userMessageSeq:start.userMessage.seq,checkId:start.checkId,taskUnderstanding:base});if(proposal.status==='stale')return {stale:true};if(proposal.status==='task-only'){return {understanding:goals.applyTask(base,proposal.operations)};}return {draftId:proposal.id};},check:options=>{
    if(!valid())return Promise.resolve({status:'disposed'});
    if(!budget.reserve(options.maxTokens))return Promise.resolve({status:'budget-exhausted'});
    return checked(task,'chat',options);
   }}).finally(()=>inflight.delete(task));
   inflight.set(task,pending);const result=await pending;if(isActive()&&result.status==='corrected')checkpoints.sideUpdated(task);return result;
  },
  async answer(sessionId,cardId,text){
   const task=consentedTask(sessionId);if(!cards)throw new Error('Unknown clarification card');
   if(typeof text!=='string'||!text.trim()||Buffer.byteLength(text)>4000)throw new Error('Invalid clarification answer');
   if(budget.isPaused(task))return {status:'paused'};const config=route();if(inflight.has(task)||observer.status(task)?.status==='observing')return {status:'busy'};
   const expected=cardRevision(task),expectedToken=execution.snapshot(task).token;const card=cards.get(task,cardId);if(!card||!cards.beginAnswer(task,cardId,expected,text))throw new Error('Clarification card is no longer current');
   const generation=generations.get(task)??0;
   const valid=()=>generation===(generations.get(task)??0)&&isActive()&&!budget.isPaused(task)&&budget.info().config?.enabled&&authorized(ctx.sessions.get(sessionId))&&execution.snapshot(task).token===expectedToken&&JSON.stringify(cardRevision(task))===JSON.stringify(expected)&&cards.get(task,cardId)?.status==='answering';
   const pending=Promise.resolve().then(()=>{
    const executionState=execution.snapshot(task),{instruction:_,...evidence}=assessmentInput(executionState);
    const session=ctx.sessions.get(sessionId),goalHierarchy=hierarchy(task,session);return chat.send(task,text,{kind:'correct',route:config,isActive:valid,evidence:[evidence],goalHierarchy,prepareCorrection:({result,start})=>{const side=chat.snapshot(task),base=side.basedOnMainVersion===start.mainVersion&&side.understanding?side.understanding:formalUnderstanding(task);const proposal=goals.propose({project:projectPath(session),task,userText:start.userText,operations:result.operations,mainVersion:start.mainVersion,sideVersion:start.sideVersion,throughSeq:executionState.throughSeq,expectedProjectVersion:goalHierarchy.project.version,expectedPhaseVersion:goalHierarchy.phase.version,userMessageId:start.userMessage.id,userMessageSeq:start.userMessage.seq,checkId:start.checkId,taskUnderstanding:base});if(proposal.status==='stale')return {stale:true};if(proposal.status==='task-only'){return {understanding:goals.applyTask(base,proposal.operations)};}goals.linkCard(proposal.id,{cardId,task,revision:expected,answer:text});return {draftId:proposal.id};},card:{question:card.tradeoff.question,impact:card.tradeoff.impact,requirementIds:card.requirementIds,evidenceIds:card.evidenceIds},check:options=>{
     if(!valid())return Promise.resolve({status:'disposed'});if(!budget.reserve(options.maxTokens))return Promise.resolve({status:'budget-exhausted'});return checked(task,'clarification',options);
    }});
   }).catch(()=>({status:'failed'})).then(async result=>{
    if(!isActive())return {...result,status:'disposed'};
    if(result.status!=='corrected')cards.markStale(task,cardRevision(task));
    const settled=cards.finishAnswer(task,cardId,expected,{...result,rawAnswer:text});
    await recordDisposition(task,cardId,'answer',settled);if(settled.status==='answered')checkpoints.sideUpdated(task);return settled;
   }).finally(()=>inflight.delete(task));
   inflight.set(task,pending);return pending;
  },
  async defer(sessionId,cardId,until){const task=consentedTask(sessionId);if(!cards)throw new Error('Unknown clarification card');const result={status:cards.defer(task,cardId,until)?'pending':'stale'};if(result.status==='pending')await recordDisposition(task,cardId,'defer',result);return result;},
  async dismissCard(sessionId,cardId){const task=consentedTask(sessionId);if(!cards)throw new Error('Unknown clarification card');const result={status:cards.dismiss(task,cardId)?'dismissed':'stale'};if(result.status==='dismissed')await recordDisposition(task,cardId,'dismiss',result);return result;},
  async confirmGoalChange(sessionId,draftId){const task=consentedTask(sessionId),session=ctx.sessions.get(sessionId),side=chat.snapshot(task),main=ledger.snapshot(task),throughSeq=execution.snapshot(task).throughSeq;const result=goals.confirm(projectPath(session),draftId,{task,mainVersion:main.version,sideVersion:side.version,throughSeq,confirmedBy:'local-user',applyTask:(operations,row)=>{const current=chat.snapshot(task),base=current.basedOnMainVersion===main.version&&current.understanding?current.understanding:formalUnderstanding(task),understanding=goals.applyTask(base,operations);const committed=chat.commitDraft(task,{understanding,userMessageId:row.user_message_id,userMessageSeq:row.user_message_seq,checkId:row.check_id,mainVersion:row.base_main_version,sideVersion:row.base_side_version});if(committed.status!=='corrected')throw new Error('Stale task correction');},finishCard:link=>{if(execution.snapshot(task).throughSeq!==link.revision.throughSeq)throw new Error('Stale clarification evidence');const settled=cards?.finishAnswer(link.task,link.cardId,link.revision,{status:'corrected',rawAnswer:link.answer});if(settled&&settled.status!=='answered')throw new Error('Stale clarification card');}});if(result.status==='confirmed')checkpoints.sideUpdated(task);return result;},
  async dismissGoalChange(sessionId,draftId){const task=consentedTask(sessionId),session=ctx.sessions.get(sessionId);return {status:goals.dismiss(projectPath(session),draftId,task)?'dismissed':'stale'};},
  async publishGoalDocument(sessionId){const task=consentedTask(sessionId),session=ctx.sessions.get(sessionId),side=chat.snapshot(task),main=ledger.snapshot(task),taskGoal=side.basedOnMainVersion===main.version&&side.understanding?side.understanding.goal:main.current?.goal?.text??null;return goals.publish(projectPath(session),projectPath(session),{taskGoal});},
  async dismiss(sessionId,id){return dismiss(consentedTask(sessionId),id);},
  async evidence(sessionId,eventId){return execution.evidence(consentedTask(sessionId),eventId);},
  async page(sessionId,options){return execution.page(consentedTask(sessionId),options);},
 };
 return api;
}

import { ObserverChat } from '../../packages/observer-chat/index.mjs';
import { BudgetStore } from '../../packages/observe/budget.mjs';
import { SupervisorUsage } from '../../packages/observe/usage.mjs';
import { CheckpointScheduler } from '../../packages/observe/checkpoint-scheduler.mjs';
import { createSidebarService } from '../../packages/sidebar/service.mjs';
import { mountSidebarRpc } from './web.mjs';
import { runJsonCheck } from '../../packages/dsh-adapter/json-check.mjs';
import { Ledger } from '../../packages/intent/ledger.mjs';
import { extractIntent } from '../../packages/intent/extract.mjs';
import { ExecutionStore } from '../../packages/execution/store.mjs';
import { ObserveController } from '../../packages/observe/controller.mjs';
import { ObserveReports } from '../../packages/reports/observe.mjs';
import { assessExecution, assessmentInput } from '../../packages/execution/assess.mjs';
import { CandidateRegistry } from '../../packages/validation/candidates.mjs';
import { ClarificationCards } from '../../packages/clarifications/index.mjs';
import { GoalHierarchy } from '../../packages/goals/hierarchy.mjs';
import { SharedGoalCandidates } from '../../packages/goals/candidates.mjs';
import { SharedGoalExtractor } from '../../packages/goals/extract.mjs';
import { CoachSuggestions } from '../../packages/coach/suggestions.mjs';
import { resolve,join,dirname,basename,relative,isAbsolute,sep } from 'node:path';
import { lstatSync,realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

export const name = 'taskwatch';
export const inject = ['agents', 'sessions', 'llm', 'tools', 'systemPrompt'];

// Resolve existing ancestors as well as the leaf so missing directories cannot
// hide an existing symlink into a checkout. Dangling links and access errors fail.
function canonicalPath(path) {
  path=resolve(path);
  try { lstatSync(path); }
  catch(error) {
    if(error.code!=='ENOENT')throw error;
    const parent=dirname(path);
    if(parent===path)throw error;
    return join(canonicalPath(parent),basename(path));
  }
  return realpathSync(path);
}
function inside(path,root) {
  const suffix=relative(root,path);
  return suffix===''||(!isAbsolute(suffix)&&suffix!=='..'&&!suffix.startsWith('..'+sep));
}
export function resolveLedgerPath(config = {}, env = process.env) {
  // Keep legacy explicitly configured storage semantics, including relative paths.
  if(config.dbPath)return config.dbPath;
  const defaultHome=join(homedir(),'.dsh');
  let home=typeof env.DSH_HOME==='string'&&env.DSH_HOME.trim()?env.DSH_HOME:defaultHome;
  // Same supported tilde prefixes as the public DSH home-paths contract.
  if(home==='~')home=homedir();
  else if(home.startsWith('~/')||home.startsWith('~\\'))home=join(homedir(),home.slice(2));
  if(!isAbsolute(home))throw new Error('TaskWatch requires an absolute DSH_HOME (or ~/ path); set a private home or explicit dbPath.');
  const path=join(resolve(home),'taskwatch','ledger.sqlite');
  try {
    const destination=canonicalPath(path);
    const roots=[canonicalPath(fileURLToPath(new URL('../../',import.meta.url)))];
    if(typeof config.workspacePath==='string'&&config.workspacePath.trim())roots.push(canonicalPath(config.workspacePath));
    const cwd=canonicalPath(process.cwd());
    // Starting DSH from the OS home is common and does not bind that whole
    // directory as a project. Only the standard private home gets this exception.
    if(!(cwd===canonicalPath(homedir())&&resolve(home)===defaultHome))roots.push(cwd);
    if(roots.some(root=>inside(destination,root)))throw new Error('destination is inside a protected directory');
  } catch {
    throw new Error('TaskWatch automatic ledger must resolve outside the plugin package, launch checkout and configured workspace; choose a private DSH_HOME or explicit dbPath. No ledger was moved.');
  }
  return path;
}

// Installation never starts observation or model requests. Observation requires
// explicit task binding, route and resource authorization.
export function apply(ctx, config = {}) {
  const dbPath=resolveLedgerPath(config);
  const ledger=new Ledger(dbPath);
  const execution=ledger?new ExecutionStore(ledger):null;
  let active=true;
  const inflight=new Map();
  const routes=new Map();
  const chat=ledger?new ObserverChat(ledger):null;
  const goals=ledger?new GoalHierarchy(ledger,{dbPath}):null;
  const cards=ledger?new ClarificationCards(ledger):null;
  const candidates=ledger?new CandidateRegistry(ledger):null;
  const capturedInputs=new Map();
  if(ledger)ledger.db.exec('CREATE TABLE IF NOT EXISTS validation_capture_status(task TEXT PRIMARY KEY,status TEXT NOT NULL,updated TEXT NOT NULL)');
  const captureStatus=(task,status)=>ledger.db.prepare('INSERT OR REPLACE INTO validation_capture_status VALUES (?,?,?)').run(task,status,new Date().toISOString());
  const budget=ledger?new BudgetStore(ledger):null;
  const supervisorUsage=ledger?new SupervisorUsage(ledger):null;
  const trackedCheck=async(task,category,options,invoke)=>{
    let result;
    try { result=await invoke(options); return result; }
    finally { try { supervisorUsage?.record(task,options.checkId,category,result); } catch { /* Usage telemetry must not change a supervision result. */ } }
  };
  let sidebar;
  let checkpoints;
  const checkReasons=new Map();
  const reports=ledger?new ObserveReports(ledger):null;
  const projectForTask=taskId=>{const binding=ledger.bindings().find(item=>item.taskId===taskId),session=binding&&ctx.sessions.get(binding.sessionId);const path=session?.header?.cwd??config.workspacePath;return typeof path==='string'&&path.trim()?resolve(path):null;};
  const sharedCandidates=ledger?new SharedGoalCandidates(ledger,goals,{workspaceForTask:projectForTask}):null;
  const sharedExtractor=ledger?new SharedGoalExtractor({ledger,goals,candidates:sharedCandidates,workspaceForTask:projectForTask,isActive:()=>active,check:options=>{
    const task=options.input.tasks[0]?.taskId;if(!task||!budget.reserve(options.maxTokens))return Promise.resolve({status:'budget-exhausted'});
    return trackedCheck(task,`${options.input.layer}-goal`,options,request=>runJsonCheck(ctx,request));
  }}):null;
  const sharedJobs=new Map();
  const coach=ledger?new CoachSuggestions(ledger,{workspaceForTask:projectForTask,agentForTask:taskId=>{const binding=ledger.bindings().find(item=>item.taskId===taskId);return binding?ctx.agents.get(binding.sessionId):null;},currentRevision:taskId=>revision(taskId),authorized:taskId=>active&&!!sidebar?.authorizedTask(taskId)&&!budget.isPaused(taskId)}):null;
  const runShared=async(project,layer=null)=>{
    if(!active||!sidebar?.sharedEnabled(project))return {status:'disabled'};
    if(sharedJobs.has(project))return {status:'busy'};
    const taskIds=sidebar.authorizedTasks(project);if(!taskIds.length)return {status:'no-tasks'};
    const route=routes.get(taskIds.at(-1))??budget.info().config;
    const pending=sharedExtractor.run({project,taskIds,route,layer}).finally(()=>sharedJobs.delete(project));
    sharedJobs.set(project,pending);return pending;
  };
  const hierarchyFor=(taskId,main=execution.snapshot(taskId),side=chat.snapshot(taskId))=>{const project=projectForTask(taskId),shared=project?goals.snapshot(project,taskId):{project:{path:null,version:0,summary:null,items:[]},phase:{id:null,version:0,name:null,outcome:null,items:[],status:'unset'}},formal=main.requirements.find(item=>item.id==='goal')?.text??null,formalRequirements=main.requirements.filter(item=>item.id.startsWith('requirements:')).map(item=>item.text),formalConstraints=main.requirements.filter(item=>item.id.startsWith('constraints:')).map(item=>item.text),base=side.basedOnMainVersion===main.inputVersion&&side.understanding?side.understanding:{goal:formal,requirements:formalRequirements,constraints:formalConstraints};return {project:shared.project,phase:shared.phase,task:{mainIntentVersion:main.intentVersion,formalGoal:formal,formalRequirements,formalConstraints,supervisorRevision:side.version,supervisorOverlay:side.understanding??null,supervisorCurrent:side.basedOnMainVersion===main.inputVersion,editableItems:goals.taskItems(base)}};};
  const revision=taskId=>{const s=execution.snapshot(taskId),side=chat.snapshot(taskId),hierarchy=hierarchyFor(taskId,s,side);return JSON.stringify({version:s.inputVersion,throughSeq:s.throughSeq,coverage:s.coverage,sideVersion:side.version,projectVersion:hierarchy.project.version,phaseVersion:hierarchy.phase.version});};
  const observer=ledger?new ObserveController({
    snapshot:revision,
    minIntervalMs:0,
    autoRetryStale:false,
    onReserve:(task,reservation)=>!sidebar?.managed(task)||budget.reserve(reservation.outputTokens),
    check:options=>runJsonCheck(ctx,options),
    async run(taskId,check,isActive,acceptInternalRevision){
      checkpoints?.begin(taskId);
      const reason=checkReasons.get(taskId);
      checkReasons.delete(taskId);
      if(inflight.has(taskId))return {status:'busy'};
      const promise=(async()=>{
        const alive=()=>active&&isActive();
        const before=ledger.snapshot(taskId).version;
        const beforeSeq=execution.snapshot(taskId).throughSeq;
        capturedInputs.set(taskId,{revision:revision(taskId),input:assessmentInput(supervisedExecution.snapshot(taskId))});
        const extracted=await extractIntent(ledger,taskId,options=>trackedCheck(taskId,'intent',options,check),routes.get(taskId),alive,snapshot=>execution.conversationContext(taskId,{fromVersion:snapshot.reviewedVersion}));
        if(!alive())return {status:'disposed'};
        if(ledger.snapshot(taskId).version!==before||execution.snapshot(taskId).throughSeq!==beforeSeq)return {status:'stale'};
        acceptInternalRevision();
        if(reason==='user')return extracted;
        if(!['validated-proposal','inquiry','already-reviewed'].includes(extracted.status))return extracted;
        capturedInputs.set(taskId,{revision:revision(taskId),input:assessmentInput(supervisedExecution.snapshot(taskId))});
        return assessExecution(supervisedExecution,taskId,options=>trackedCheck(taskId,'assessment',options,check),routes.get(taskId),alive);
      })().finally(()=>inflight.delete(taskId));
      inflight.set(taskId,promise);return promise;
    },
    publish(taskId,report){
      checkpoints?.complete(taskId,report);
      if(!active)return;
      // ObserveController checks that this exact revision is still current
      // immediately before publication. No await occurs below, so these values
      // describe the report evidence rather than a later sidebar refresh.
      const stored=reports.publish(taskId,revision(taskId),report);
      if(stored)cards.collect(taskId,stored.id,report,{mainVersion:ledger.snapshot(taskId).version,throughSeq:execution.snapshot(taskId).throughSeq,sideVersion:chat.snapshot(taskId).version});
      if(stored&&coach&&projectForTask(taskId)){const evidence=execution.snapshot(taskId);for(const suggestion of coach.collect(taskId,stored,{formalRequirements:evidence.requirements,events:evidence.events}))if(suggestion.risk==='auto')coach.send(taskId,suggestion.id);}
      const frozen=capturedInputs.get(taskId);capturedInputs.delete(taskId);
      if(stored){
        try{
          if(!frozen)throw new Error('No captured check input');
          candidates.capture(taskId,frozen.revision,{...report,observeReportId:stored.id},frozen.input);
          captureStatus(taskId,'captured');
        }catch{captureStatus(taskId,'capture-failed');}
      }
      if(['validated-proposal','inquiry'].includes(report?.status)){
        const project=projectForTask(taskId);
        if(sidebar?.sharedEnabled(project))queueMicrotask(()=>runShared(project).catch(()=>{}));
      }
    },
  }):null;
  const supervisedExecution={
    snapshot(taskId){const main=execution.snapshot(taskId),side=chat.snapshot(taskId),goalHierarchy=hierarchyFor(taskId,main,side);return {...main,mainToken:main.token,token:`${main.token}:${side.version}:${goalHierarchy.project.version}:${goalHierarchy.phase.version}`,goalHierarchy,observerUnderstanding:side.understanding&&side.basedOnMainVersion===main.inputVersion?{...side.understanding,version:side.version,mainVersion:side.basedOnMainVersion,source:'sidebar-only-not-sent-to-main'}:null};},
    save(taskId,snapshot,status,body){if(supervisedExecution.snapshot(taskId).token!==snapshot.token)return {status:'stale'};return execution.save(taskId,{...snapshot,token:snapshot.mainToken},status,body);},
  };
  checkpoints=ledger?new CheckpointScheduler({ledger,
    isActive:taskId=>active&&['active','observing'].includes(observer.status(taskId)?.status)&&!budget.isPaused(taskId),
    notify:(taskId,reason)=>{checkReasons.set(taskId,reason);return observer.notify(taskId);},
  }):null;
  const requireLedger=()=>{if(!active)throw new Error('TaskWatch disposed');if(!ledger)throw new Error('Configure TaskWatch dbPath first');return ledger;};
  if(ledger){
    for(const binding of ledger.bindings()){
      try{const session=ctx.sessions.get(binding.sessionId);ledger.reconcile(binding.taskId,session);execution.reconcile(binding.taskId,session);}
      catch{ledger.markGap(binding.sessionId,'backfill-failed');execution.markGap(binding.taskId,'backfill-failed');}
    }
    ctx.on('session/event',(session,event)=>{
      if(!active)return;
      const binding=ledger.bindings().find(item=>item.sessionId===session.id);
      if(binding)try{coach?.observe(binding.taskId,event);}catch{}
      try{sidebar?.onEvent(session,event);}catch{ /* Report configuration/budget state via sidebar; never interrupt the main event. */ }
      let changed=false;
      try {ledger.transaction(()=>{const user=ledger.ingest(session.id,event);const evidence=execution.ingest(session.id,event);changed=user||evidence;});}
      catch {ledger.markGap(session.id,'event-ingestion-failed');changed=true;}
      if(changed){
        const binding=ledger.bindings().find(b=>b.sessionId===session.id);
        if(binding)checkpoints.event(binding.taskId,event.seq,event.type);
      }
    },{global:true});
    ctx.on('dispose',()=>{active=false;checkpoints.dispose();observer.dispose();ledger.close();});
  }
  const service={
    get sidebar(){return sidebar;},
    check: options => runJsonCheck(ctx, options),
    bind(taskId,sessionId){
      const l=requireLedger();const session=ctx.sessions.get(sessionId);
      if(!session)throw new Error('Bind requires a live DSH session');
      l.bind(taskId,sessionId);
      try {l.reconcile(taskId,session);execution.reconcile(taskId,session);}
      catch {l.markGap(sessionId,'backfill-failed');throw new Error('TaskWatch backfill failed');}
      return l.snapshot(taskId);
    },
    snapshot: taskId=>requireLedger().snapshot(taskId),
    history: taskId=>requireLedger().history(taskId),
    evidence(taskId){requireLedger();return execution.snapshot(taskId);},
    assessments(taskId){requireLedger();return execution.history(taskId);},
    validationCandidates(taskId){requireLedger();return candidates.list(taskId);},
    validationStatus(taskId){requireLedger().snapshot(taskId);return ledger.db.prepare('SELECT status,updated FROM validation_capture_status WHERE task=?').get(taskId)??{status:'not-captured'};},
    observe(taskId,options){
      requireLedger().snapshot(taskId);
      if(inflight.has(taskId))throw new Error('TaskWatch check is busy');
      if(reports.state(taskId))throw new Error('Observe already started for this task');
      if(!options||typeof options.provider!=='string'||!options.provider.trim()||typeof options.model!=='string'||!options.model.trim())throw new Error('Explicit model route required');
      // Controller validates resource limits before authorization is persisted.
      const result=observer.start(taskId,options);
      try {reports.start(taskId,options);routes.set(taskId,{...options});}
      catch(error){observer.stop(taskId);throw error;}
      observer.notify(taskId);return result;
    },
    stopObserve(taskId){requireLedger();checkpoints.pause(taskId);return observer.stop(taskId);},
    observeStatus(taskId){requireLedger();return observer.status(taskId)??reports.state(taskId);},
    flushObserve(taskId){requireLedger();checkpoints.flush(taskId);return observer.flush(taskId);},
    notifications(taskId){requireLedger();const current=revision(taskId);return reports.list(taskId).map(item=>({...item,current:item.revision===current}));},
    dismiss(taskId,id){requireLedger();return reports.dismiss(taskId,id);},
    assess(taskId,route){
      requireLedger();
      if(sidebar?.managed(taskId)||reports.state(taskId))return Promise.resolve({status:'observe-active'});
      if(inflight.has(taskId))return Promise.resolve({status:'busy'});
      const promise=assessExecution(execution,taskId,options=>trackedCheck(taskId,'assessment',options,request=>runJsonCheck(ctx,request)),route,()=>active).finally(()=>inflight.delete(taskId));
      inflight.set(taskId,promise);return promise;
    },
    extract(taskId,route){
      const l=requireLedger();
      if(sidebar?.managed(taskId)||reports.state(taskId))return Promise.resolve({status:'observe-active'});
      if(inflight.has(taskId))return Promise.resolve({status:'busy'});
      const promise=extractIntent(l,taskId,options=>trackedCheck(taskId,'intent',options,request=>runJsonCheck(ctx,request)),route,()=>active,snapshot=>execution.conversationContext(taskId,{fromVersion:snapshot.reviewedVersion})).finally(()=>inflight.delete(taskId));
      inflight.set(taskId,promise);return promise;
    },
  };
  if(ledger)sidebar=createSidebarService({ctx,ledger,execution,chat,goals,sharedCandidates,runShared,coach,budget,supervisorUsage,observer,checkpoints,routes,inflight,workspacePath:config.workspacePath,
    bind:service.bind,check:options=>runJsonCheck(ctx,options),isActive:()=>active,notifications:service.notifications,dismiss:service.dismiss,cards,
    validationStatus:service.validationStatus,
    onCardDisposition(task,cardId,action,result){
      try{
        const card=cards.get(task,cardId);
        const candidate=candidates.list(task).find(item=>item.report.observeReportId===card?.report_id);
        if(candidate)candidates.recordFeedback(candidate.id,{reviewer:'local-user-action',verdict:action,cardId,status:result.status,answer:card.answer??null});
        else captureStatus(task,'feedback-capture-failed');
      }catch{captureStatus(task,'feedback-capture-failed');}
    }});
  ctx.provide('taskwatch',Object.freeze(service));
  if(sidebar){sidebar.restore();ctx.inject(['connection','webServer','taskwatch'],scope=>mountSidebarRpc(scope));}
}

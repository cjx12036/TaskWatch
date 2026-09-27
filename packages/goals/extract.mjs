import {createHash,randomUUID} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {PROJECT_CANDIDATE_INSTRUCTIONS,PHASE_CANDIDATE_INSTRUCTIONS} from './candidates.mjs';
import {MAX_CHECK_INPUT_BYTES} from '../dsh-adapter/limits.mjs';
import {safeCheckDiagnostics} from '../dsh-adapter/diagnostics.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical=value=>{try{return realpathSync(value);}catch{return resolve(value);}};

export class SharedGoalExtractor{
  constructor({ledger,goals,candidates,workspaceForTask,check,isActive=()=>true,maxInputBytes=MAX_CHECK_INPUT_BYTES}){
    if(!ledger?.db||!goals||!candidates||typeof workspaceForTask!=='function'||typeof check!=='function')throw new TypeError('Shared extractor dependencies required');
    Object.assign(this,{ledger,goals,candidates,workspaceForTask,check,isActive,maxInputBytes,db:ledger.db});
    this.db.exec(`CREATE TABLE IF NOT EXISTS shared_goal_extraction_calls(id TEXT PRIMARY KEY,project TEXT NOT NULL,layer TEXT NOT NULL,input_hash TEXT NOT NULL,status TEXT NOT NULL,check_id TEXT,model TEXT,input TEXT NOT NULL,output TEXT,error_code TEXT,diagnostics TEXT,created TEXT NOT NULL,UNIQUE(project,layer,input_hash));`);
  }
  #sources(project,taskIds,layer){
    const tasks=[];const explicit=[];
    for(const taskId of taskIds){
      if(canonical(this.workspaceForTask(taskId))!==project)throw new Error('Cross-workspace shared extraction');
      const snapshot=this.ledger.snapshot(taskId);
      if(!snapshot.current||snapshot.status==='incomplete-evidence')continue;
      const byId=new Map(snapshot.messages.map(m=>[m.id,m]));
      const claims=[snapshot.current.goal,...['requirements','acceptance','constraints','exclusions'].flatMap(key=>snapshot.current[key]??[])].filter(Boolean);
      const claimRefs=claims.flatMap(claim=>claim.evidence??[]);
      const hints=this.ledger.history(taskId).filter(record=>['validated-proposal','inquiry'].includes(record.status)).flatMap(record=>record.body?.sharedScopeHints??[]).filter(h=>h.layer===layer);
      const refs=[...claimRefs.map(ref=>({...ref,kind:'formal-claim'})),...hints.map(ref=>({...ref,kind:'hint'}))];
      const sources=[];
      for(const ref of refs){const message=byId.get(ref.messageId);if(!message?.complete||!message.text.includes(ref.quote))continue;sources.push({taskId,messageId:message.id,quote:ref.quote,time:message.time,kind:ref.kind});}
      if(sources.some(source=>source.kind==='hint')){
        explicit.push(taskId);
        for(const hint of hints){const message=byId.get(hint.messageId);if(message?.complete&&Buffer.byteLength(message.text)<=6000)sources.push({taskId,messageId:message.id,quote:message.text,time:message.time,kind:'hint-context'});}
      }
      tasks.push({taskId,version:snapshot.version,goal:snapshot.current.goal?.text??null,sources:[...new Map(sources.map(source=>[`${source.messageId}:${source.quote}`,source])).values()]});
    }
    return {tasks,explicit};
  }
  async run({project,taskIds,route,layer=null}){
    project=canonical(project);if(!Array.isArray(taskIds)||!taskIds.length||new Set(taskIds).size!==taskIds.length)throw new Error('Bound task IDs required');
    if(layer===null){const projectResult=await this.run({project,taskIds,route,layer:'project'});const phaseResult=await this.run({project,taskIds,route,layer:'phase'});return {status:projectResult.status==='no-signal'&&phaseResult.status==='no-signal'?'no-signal':'checked-layers',project:projectResult,phase:phaseResult};}
    if(!['project','phase'].includes(layer))throw new Error('Invalid shared layer');
    const {tasks,explicit}=this.#sources(project,taskIds,layer),view=this.goals.snapshot(project);
    if(!explicit.length&&((layer==='project'?view.project.version:view.phase.version)>0||tasks.length<2))return {status:'no-signal'};
    const queues=tasks.map(task=>[...new Map(task.sources.map(source=>[`${source.messageId}:${source.quote}`,source])).values()].sort((a,b)=>(a.time??Number.MAX_SAFE_INTEGER)-(b.time??Number.MAX_SAFE_INTEGER)));
    const sources=[];while(queues.some(queue=>queue.length))for(const queue of queues)if(queue.length)sources.push(queue.shift());
    if(!sources.length)return {status:'no-signal'};
    const buildInput=windowSources=>({instruction:layer==='project'?PROJECT_CANDIDATE_INSTRUCTIONS:PHASE_CANDIDATE_INSTRUCTIONS,layer,workspace:project,current:{project:view.project,phase:view.phase,phaseHistory:view.phaseHistory},tasks:tasks.filter(task=>windowSources.some(source=>source.taskId===task.taskId)).map(task=>({...task,sources:windowSources.filter(source=>source.taskId===task.taskId)})),sources:windowSources});
    const fits=windowSources=>Buffer.byteLength(JSON.stringify(buildInput(windowSources)))<=this.maxInputBytes;
    const windows=[];let current=[];
    for(const source of sources){if(current.length&&!fits([...current,source])){windows.push(current);current=[];}if(!fits([source])){const oversized=buildInput([source]),inputHash=hash({layer,projectVersion:view.project.version,phaseVersion:view.phase.version,oversized});this.db.prepare('INSERT OR IGNORE INTO shared_goal_extraction_calls VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),project,layer,inputHash,'input-too-large',null,route.model,JSON.stringify(oversized),null,'input-too-large',null,new Date().toISOString());return {status:'input-too-large',uncoveredSource:{taskId:source.taskId,messageId:source.messageId}};}current.push(source);}
    if(current.length)windows.push(current);
    const crossTaskInferenceCovered=new Set(sources.map(source=>source.taskId)).size<2||windows.some(window=>new Set(window.map(source=>source.taskId)).size>=2);
    const results=[];
    for(const windowSources of windows)results.push(await this.#runWindow({project,layer,route,view,tasks,input:buildInput(windowSources)}));
    if(results.length===1)return results[0];
    return {status:crossTaskInferenceCovered&&results.every(result=>['none','already-checked','pending','needs-clarification'].includes(result.status))?'windows-complete':'windows-incomplete',windows:results.length,crossTaskInferenceCovered,results};
  }
  async #runWindow({project,layer,route,view,tasks,input}){
    const inputHash=hash({layer,projectVersion:view.project.version,phaseVersion:view.phase.version,tasks:input.tasks,sources:input.sources});
    if(this.db.prepare('SELECT id FROM shared_goal_extraction_calls WHERE project=? AND layer=? AND input_hash=?').get(project,layer,inputHash))return {status:'already-checked'};
    const id=randomUUID(),checkId=randomUUID(),now=new Date().toISOString();
    this.db.prepare('INSERT INTO shared_goal_extraction_calls VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(id,project,layer,inputHash,'started',checkId,route.model,JSON.stringify(input),null,null,null,now);
    let output=null,status='failed',errorCode=null,diagnostics=null;
    try{
      const response=await this.check({provider:route.provider,model:route.model,maxTokens:route.maxTokens??3072,timeoutMs:route.timeoutMs??180000,cleanupTimeoutMs:5000,checkId,input});
      diagnostics=safeCheckDiagnostics(response?.diagnostics);
      if(!this.isActive()||tasks.some(task=>this.ledger.snapshot(task.taskId).version!==task.version)||this.goals.snapshot(project).project.version!==view.project.version||this.goals.snapshot(project).phase.version!==view.phase.version){status='stale';return {status};}
      if(response?.status!=='completed'){status=response?.status==='timeout'?'timeout':'failed';errorCode=response?.errorCode??status;return {status};}
      output=response.value;const candidate=this.candidates.accept({project,layer,taskIds:input.tasks.map(t=>t.taskId),checkId,output,input,model:route.model});status='completed';return candidate;
    }catch(error){errorCode=error.message;status='invalid-output';return {status,errorCode};}
    finally{this.db.prepare('UPDATE shared_goal_extraction_calls SET status=?,output=?,error_code=?,diagnostics=? WHERE id=?').run(status,output?JSON.stringify(output):null,errorCode,diagnostics?JSON.stringify(diagnostics):null,id);}
  }
  calls(project){return this.db.prepare('SELECT * FROM shared_goal_extraction_calls WHERE project=? ORDER BY created,rowid').all(canonical(project)).map(row=>({...row,input:JSON.parse(row.input),output:row.output?JSON.parse(row.output):null}));}
}

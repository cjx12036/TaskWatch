import {createHash,randomUUID} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';

const CANDIDATE_WIRE=`Return exactly the top-level keys {checkId,kind,basis,operations,question}. Copy checkId exactly. kind is "none", "clarification", or "candidate". For kind "none": basis="none", operations=[], question=null. For kind "clarification": operations=[], question is one nonempty question. For kind "candidate": basis is "explicit" or "inferred", operations is nonempty, question=null; do not put an approval request in question because the host separately asks the user to confirm.
Every operation MUST use the key "tool" (never "op"), and every cited source MUST be {taskId,messageId,quote} with an exact contiguous user quote. Field schemas, with NO extra or renamed keys: set_summary={tool:"set_summary",layer,text,sources}; add_item={tool:"add_item",layer,collection,text,sources}; update_item={tool:"update_item",layer,itemId,text,sources}; remove_item={tool:"remove_item",layer,itemId,sources}; propose_phase_transition={tool:"propose_phase_transition",name,outcome,acceptance,sources}. acceptance MUST be an array of nonempty strings, never a string; use [] only when the user supplied no acceptance criteria. collections: requirements, successCriteria, acceptance, constraints, nonGoals, priorities. A project summary example is {"checkId":"COPY_INPUT_CHECK_ID","kind":"candidate","basis":"explicit","operations":[{"tool":"set_summary","layer":"project","text":"long-term user goal","sources":[{"taskId":"SOURCE_TASK","messageId":"SOURCE_MESSAGE","quote":"EXACT USER QUOTE"}]}],"question":null}. A phase transition example is {"checkId":"COPY_INPUT_CHECK_ID","kind":"candidate","basis":"explicit","operations":[{"tool":"propose_phase_transition","name":"phase name","outcome":"deliverable","acceptance":["user-specified acceptance"],"sources":[{"taskId":"SOURCE_TASK","messageId":"SOURCE_MESSAGE","quote":"EXACT USER QUOTE"}]}],"question":null}. Replace all example placeholders with exact input values; do not copy example IDs.`;
export const PROJECT_CANDIDATE_INSTRUCTIONS=`Extract candidates for the enduring project purpose only. You observe user-authored evidence from bound tasks; never execute work. Distinguish an explicit user statement from an inference supported by at least two independent tasks. Do not promote one task's implementation step into a project principle. Compare with confirmed project items by stable ID; omission never removes an item. Include explicit enduring constraints and success criteria as separate add_item operations with their own exact quotes; do not summarize them away. Use only set_summary, add_item, update_item, remove_item, and layer="project". Removal needs an explicit user revocation. No candidate when evidence is insufficient. A candidate is supervisor-only until a user confirms it. ${CANDIDATE_WIRE}`;
export const PHASE_CANDIDATE_INSTRUCTIONS=`Extract candidates for the active phase only. You observe user-authored evidence from bound tasks; never execute work. Distinguish adding to the active phase from proposing a phase transition. A newer task topic alone does not end a phase; when reliable chronology or user intent is unclear, return a clarification. Compare with confirmed phase and history by stable ID. Put every explicit acceptance criterion in the acceptance string array of a proposed transition, with exact user quote sources. Use propose_phase_transition, set_summary, add_item, update_item, remove_item; ordinary items require layer="phase". Never archive the old phase without user confirmation. ${CANDIDATE_WIRE}`;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical=value=>{try{return realpathSync(value);}catch{return resolve(value);}};
const text=value=>typeof value==='string'&&value.trim()&&Buffer.byteLength(value)<=4000;
const shape=(value,fields)=>value&&typeof value==='object'&&!Array.isArray(value)&&fields.every(k=>Object.hasOwn(value,k))&&Object.keys(value).every(k=>fields.includes(k));

export class SharedGoalCandidates{
  constructor(ledger,goals,{workspaceForTask}={}){
    if(!ledger?.db||!goals||typeof workspaceForTask!=='function')throw new TypeError('Shared candidates require a ledger, goals and workspace resolver');
    this.ledger=ledger;this.goals=goals;this.workspaceForTask=workspaceForTask;this.db=ledger.db;
    this.db.exec(`CREATE TABLE IF NOT EXISTS shared_goal_candidates(id TEXT PRIMARY KEY,project TEXT NOT NULL,layer TEXT NOT NULL,basis TEXT NOT NULL,status TEXT NOT NULL,operations TEXT NOT NULL,sources TEXT NOT NULL,task_versions TEXT NOT NULL,base_project_version INTEGER NOT NULL,base_phase_version INTEGER NOT NULL,check_id TEXT NOT NULL,input_hash TEXT,output_hash TEXT NOT NULL,model TEXT,question TEXT,created TEXT NOT NULL,resolved TEXT,UNIQUE(project,layer,input_hash,base_project_version,base_phase_version));`);
  }
  #source(ref,project,allowed){
    if(!shape(ref,['taskId','messageId','quote'])||!allowed.has(ref.taskId)||!text(ref.quote))throw new Error('Invalid candidate source');
    if(!this.ledger.bindings().some(binding=>binding.taskId===ref.taskId)||canonical(this.workspaceForTask(ref.taskId))!==project)throw new Error('Unbound or cross-workspace candidate source');
    const snapshot=this.ledger.snapshot(ref.taskId),message=snapshot.messages.find(m=>m.id===ref.messageId);
    if(!message?.complete||!message.text.includes(ref.quote))throw new Error('Invalid candidate source quote');
    return {taskId:ref.taskId,messageId:ref.messageId,quote:ref.quote,version:snapshot.version,time:message.time};
  }
  #validate({project,layer,taskIds,checkId,output}){
    if(!['project','phase'].includes(layer)||!Array.isArray(taskIds)||!taskIds.length||new Set(taskIds).size!==taskIds.length||!shape(output,['checkId','kind','basis','operations','question'])||output.checkId!==checkId||!['none','clarification','candidate'].includes(output.kind)||!['none','explicit','inferred'].includes(output.basis)||!Array.isArray(output.operations)||output.operations.length>32)throw new Error('Invalid shared candidate output');
    if(output.kind==='none'&&(output.basis!=='none'||output.operations.length||output.question!==null))throw new Error('Invalid empty candidate');
    if(output.kind==='clarification'&&(!text(output.question)||output.operations.length))throw new Error('Invalid candidate clarification');
    if(output.kind==='candidate'&&(!output.operations.length||!['explicit','inferred'].includes(output.basis)||output.question!==null))throw new Error('Invalid candidate operations');
    const allowed=new Set(taskIds),sources=[],versions=new Map();
    for(const op of output.operations){
      if(!op||typeof op!=='object'||Array.isArray(op)||!Array.isArray(op.sources)||!op.sources.length||op.sources.length>24)throw new Error('Invalid candidate sources');
      if(op.tool==='propose_phase_transition'){
        if(layer!=='phase'||!shape(op,['tool','name','outcome','acceptance','sources'])||!text(op.name)||!text(op.outcome)||!Array.isArray(op.acceptance)||op.acceptance.some(v=>!text(v)))throw new Error('Invalid phase candidate');
      }else if(op.tool==='set_summary'){
        if(!shape(op,['tool','layer','text','sources'])||op.layer!==layer||!text(op.text))throw new Error('Invalid summary candidate');
      }else if(op.tool==='add_item'){
        if(!shape(op,['tool','layer','collection','text','sources'])||op.layer!==layer||!text(op.text))throw new Error('Invalid item candidate');
      }else if(op.tool==='update_item'||op.tool==='remove_item'){
        const fields=op.tool==='update_item'?['tool','layer','itemId','text','sources']:['tool','layer','itemId','sources'];
        if(!shape(op,fields)||op.layer!==layer||!text(op.itemId)||op.tool==='update_item'&&!text(op.text))throw new Error('Invalid item change');
      }else throw new Error('Invalid candidate operation');
      for(const raw of op.sources){const ref=this.#source(raw,project,allowed);sources.push(ref);versions.set(ref.taskId,ref.version);}
      if(op.tool==='remove_item'&&!op.sources.some(ref=>/(删除|移除|取消|撤销|不再|remove|delete|revoke|drop)/iu.test(ref.quote)))throw new Error('Removal needs explicit revocation');
    }
    if(output.kind==='candidate'&&output.basis==='inferred'&&versions.size<2)throw new Error('Inferred candidate needs independent tasks');
    if(output.kind==='candidate'&&output.basis==='inferred'&&output.operations.some(op=>op.tool==='propose_phase_transition')&&sources.some(source=>source.time===null||source.time===undefined))throw new Error('Inferred phase transition needs verified event time');
    return {sources:[...new Map(sources.map(s=>[`${s.taskId}:${s.messageId}:${s.quote}`,s])).values()],versions:Object.fromEntries(versions)};
  }
  accept({project,layer,taskIds,checkId,output,input=null,model=null}){
    project=canonical(project);const {sources,versions}=this.#validate({project,layer,taskIds,checkId,output});
    const view=this.goals.snapshot(project),inputHash=hash(input??{layer,taskIds,sources,projectVersion:view.project.version,phaseVersion:view.phase.version}),outputHash=hash(output),now=new Date().toISOString();
    const prior=this.db.prepare('SELECT * FROM shared_goal_candidates WHERE project=? AND layer=? AND input_hash=? AND base_project_version=? AND base_phase_version=?').get(project,layer,inputHash,view.project.version,view.phase.version);
    if(prior)return this.#decode(prior);
    const id=randomUUID(),status=output.kind==='candidate'?'pending':output.kind==='clarification'?'needs-clarification':'none';
    this.db.prepare('INSERT INTO shared_goal_candidates VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,project,layer,output.basis,status,JSON.stringify(output.operations),JSON.stringify(sources),JSON.stringify(versions),view.project.version,view.phase.version,checkId,inputHash,outputHash,model,output.question,now,null);
    return this.get(project,id);
  }
  #decode(row){const operations=JSON.parse(row.operations);return {id:row.id,project:row.project,layer:row.layer,basis:row.basis,status:row.status,operations,preview:this.goals.preview(row.project,{operations:operations.map(({sources,...op})=>({...op,source:sources[0]?.quote??''}))}),sources:JSON.parse(row.sources),taskVersions:JSON.parse(row.task_versions),baseProjectVersion:row.base_project_version,basePhaseVersion:row.base_phase_version,inputHash:row.input_hash,outputHash:row.output_hash,model:row.model,question:row.question,created:row.created};}
  get(project,id){const row=this.db.prepare('SELECT * FROM shared_goal_candidates WHERE project=? AND id=?').get(canonical(project),id);return row?this.#decode(row):null;}
  list(project){return this.db.prepare('SELECT * FROM shared_goal_candidates WHERE project=? ORDER BY rowid DESC').all(canonical(project)).map(row=>this.#decode(row));}
  dismiss(project,id){return !!this.db.prepare("UPDATE shared_goal_candidates SET status='dismissed',resolved=? WHERE project=? AND id=? AND status='pending'").run(new Date().toISOString(),canonical(project),id).changes;}
  confirm(project,id){project=canonical(project);return this.ledger.transaction(()=>{
    const row=this.db.prepare('SELECT * FROM shared_goal_candidates WHERE project=? AND id=?').get(project,id);if(!row||row.status!=='pending')return {status:'stale'};
    const candidate=this.#decode(row),view=this.goals.snapshot(project);
    if(view.project.version!==candidate.baseProjectVersion||view.phase.version!==candidate.basePhaseVersion||Object.entries(candidate.taskVersions).some(([task,version])=>!this.ledger.bindings().some(binding=>binding.taskId===task)||this.ledger.snapshot(task).version!==version||canonical(this.workspaceForTask(task))!==project)){
      this.db.prepare("UPDATE shared_goal_candidates SET status='stale',resolved=? WHERE id=?").run(new Date().toISOString(),id);return {status:'stale'};
    }
    const primary=candidate.sources[0],quotes=candidate.sources.map(s=>s.quote).join('\n');
    const operations=candidate.operations.map(({sources,...op})=>({...op,source:sources[0].quote}));
    const draft=this.goals.propose({project,task:primary.taskId,userText:quotes,operations,sourceRefs:candidate.sources,operationSourceRefs:candidate.operations.map(op=>op.sources),supersedePending:false,mainVersion:candidate.taskVersions[primary.taskId],sideVersion:0,throughSeq:null,expectedProjectVersion:candidate.baseProjectVersion,expectedPhaseVersion:candidate.basePhaseVersion,userMessageId:primary.messageId,userMessageSeq:this.ledger.snapshot(primary.taskId).messages.find(m=>m.id===primary.messageId).seq,checkId:row.check_id});
    if(draft.status==='stale')return {status:'stale'};
    const result=this.goals.confirm(project,draft.id,{task:primary.taskId,mainVersion:candidate.taskVersions[primary.taskId],sideVersion:0,throughSeq:null,confirmedBy:'local-user'});
    if(result.status!=='confirmed')return result;
    this.db.prepare("UPDATE shared_goal_candidates SET status='confirmed',resolved=? WHERE id=?").run(new Date().toISOString(),id);
    return result;
  });}
}

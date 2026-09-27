import {createHash,randomUUID} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {createUserMessage} from '@deepseek-ai/dsh-llm/message';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical=value=>{try{return realpathSync(value);}catch{return resolve(value);}};
const TTL_MS=120000,COOLDOWN_MS=600000,MAX_PER_TASK=3;

export class CoachSuggestions{
  constructor(ledger,{workspaceForTask,agentForTask,currentRevision,authorized=()=>true,now=Date.now}){
    if(!ledger?.db||[workspaceForTask,agentForTask,currentRevision,authorized,now].some(fn=>typeof fn!=='function'))throw new TypeError('Coach dependencies required');
    Object.assign(this,{ledger,db:ledger.db,workspaceForTask,agentForTask,currentRevision,authorized,now});
    this.db.exec(`CREATE TABLE IF NOT EXISTS coach_projects(project TEXT PRIMARY KEY,enabled INTEGER NOT NULL,epoch INTEGER NOT NULL,updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS coach_consents(task TEXT PRIMARY KEY REFERENCES tasks(id),project TEXT NOT NULL,epoch INTEGER NOT NULL,accepted INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS coach_suggestions(id TEXT PRIMARY KEY,task TEXT NOT NULL REFERENCES tasks(id),project TEXT NOT NULL,report_id TEXT NOT NULL,report_revision TEXT NOT NULL,finding_index INTEGER NOT NULL,subject TEXT NOT NULL,risk TEXT NOT NULL,status TEXT NOT NULL,body TEXT NOT NULL,requirement_ids TEXT NOT NULL,evidence_ids TEXT NOT NULL,created INTEGER NOT NULL,expires INTEGER NOT NULL,updated INTEGER NOT NULL,UNIQUE(task,subject));
      CREATE TABLE IF NOT EXISTS coach_deliveries(id TEXT PRIMARY KEY,suggestion_id TEXT NOT NULL UNIQUE REFERENCES coach_suggestions(id),message_id TEXT NOT NULL UNIQUE,status TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);`);
  }
  project(project){const row=this.db.prepare('SELECT enabled,epoch FROM coach_projects WHERE project=?').get(canonical(project));return {enabled:!!row?.enabled,epoch:row?.epoch??0};}
  setProject(project,enabled){if(typeof enabled!=='boolean')throw new TypeError('Invalid coach setting');project=canonical(project);return this.ledger.transaction(()=>{const old=this.project(project),epoch=old.enabled===enabled?old.epoch:old.epoch+1;this.db.prepare('INSERT INTO coach_projects VALUES (?,?,?,?) ON CONFLICT(project) DO UPDATE SET enabled=excluded.enabled,epoch=excluded.epoch,updated=excluded.updated').run(project,Number(enabled),epoch,this.now());return {enabled,epoch};});}
  consent(task,project){project=canonical(project);this.ledger.snapshot(task);if(canonical(this.workspaceForTask(task))!==project||!this.project(project).enabled)throw new Error('Coach project is not enabled for task');const epoch=this.project(project).epoch;this.db.prepare('INSERT INTO coach_consents VALUES (?,?,?,?) ON CONFLICT(task) DO UPDATE SET project=excluded.project,epoch=excluded.epoch,accepted=excluded.accepted').run(task,project,epoch,this.now());return {task,project,epoch};}
  consented(task){const project=canonical(this.workspaceForTask(task)),setting=this.project(project),row=this.db.prepare('SELECT epoch,project FROM coach_consents WHERE task=?').get(task);return setting.enabled&&row?.project===project&&row.epoch===setting.epoch;}
  #decode(row){return {id:row.id,taskId:row.task,project:row.project,reportId:row.report_id,reportRevision:row.report_revision,findingIndex:row.finding_index,risk:row.risk,status:row.status,text:row.body,requirementIds:JSON.parse(row.requirement_ids),evidenceIds:JSON.parse(row.evidence_ids),created:row.created,expires:row.expires,delivery:this.db.prepare('SELECT message_id,status,created FROM coach_deliveries WHERE suggestion_id=?').get(row.id)??null};}
  list(task){return this.db.prepare('SELECT * FROM coach_suggestions WHERE task=? ORDER BY created,rowid').all(task).map(row=>this.#decode(row));}
  get(task,id){const row=this.db.prepare('SELECT * FROM coach_suggestions WHERE task=? AND id=?').get(task,id);return row?this.#decode(row):null;}
  collect(task,item,evidence){this.ledger.snapshot(task);if(!this.consented(task)||!this.authorized(task)||item?.revision!==this.currentRevision(task)||item?.report?.status!=='assessed'||item.report.result?.validation?.complete!==true)return [];
    const result=item.report.result,indexes=result.notification?.findingIndexes;if(!Array.isArray(indexes))return [];
    const formal=new Map((evidence?.formalRequirements??[]).map(req=>[req.id,req])),events=new Map((evidence?.events??[]).map(event=>[event.id,event])),made=[],project=canonical(this.workspaceForTask(task));
    for(const index of indexes){const finding=result.findings?.[index];if(!finding||!['deviation','tradeoff'].includes(finding.category)||!Array.isArray(finding.requirementIds)||!Array.isArray(finding.evidenceIds)||!finding.requirementIds.length||!finding.evidenceIds.length)continue;
      const refs=finding.requirementIds.map(id=>formal.get(id)),proof=finding.evidenceIds.map(id=>events.get(id));
      const auto=finding.category==='deviation'&&refs.every(Boolean)&&proof.every(Boolean)&&proof.some(e=>['tool/call','tool/result'].includes(e.type));
      if(finding.category==='deviation'&&!auto)continue;
      const risk=auto?'auto':'approval',subject=hash({task,category:finding.category,requirements:[...finding.requirementIds].sort(),topic:auto?'formal-deviation':finding.tradeoff?.question??finding.observation});
      const tool=proof.find(e=>['tool/call','tool/result'].includes(e?.type));
      const body=auto?`TaskWatch 监督提醒（非用户指令）：公开执行记录中的 ${tool?.data?.name??'工具操作'} 可能与用户要求“${refs[0].text}”偏离。请核对后继续推进原目标；不要据此扩大授权。`:`TaskWatch 监督建议（非用户指令）：${finding.observation}。可能影响：${finding.tradeoff?.impact??finding.interpretation}。请先核对用户是否接受此取舍；不要自行改变目标或授权。`;
      const now=this.now(),id=randomUUID();
      const stored=this.db.prepare('INSERT OR IGNORE INTO coach_suggestions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,task,project,item.id,item.revision,index,subject,risk,risk==='auto'?'ready':'approval',body,JSON.stringify(finding.requirementIds),JSON.stringify(finding.evidenceIds),now,now+TTL_MS,now);
      if(stored.changes)made.push(this.get(task,id));
    }
    return made;
  }
  dismiss(task,id){return !!this.db.prepare("UPDATE coach_suggestions SET status='dismissed',updated=? WHERE task=? AND id=? AND status IN ('ready','approval','skipped-idle')").run(this.now(),task,id).changes;}
  send(task,id,{approved=false}={}){
    const row=this.db.prepare('SELECT * FROM coach_suggestions WHERE task=? AND id=?').get(task,id);if(!row)return {status:'missing'};
    if(!this.consented(task)||!this.authorized(task))return {status:'unauthorized'};
    if(row.report_revision!==this.currentRevision(task))return {status:'stale'};
    if(this.now()>row.expires)return {status:'expired'};
    if(row.risk==='approval'&&!approved)return {status:'approval-required'};
    if(!['ready','approval','skipped-idle'].includes(row.status))return {status:row.status};
    const agent=this.agentForTask(task);if(!agent||agent.id!==this.ledger.snapshot(task).sessionId||agent.status!=='running'){
      this.db.prepare("UPDATE coach_suggestions SET status='skipped-idle',updated=? WHERE id=?").run(this.now(),id);return {status:'skipped-idle'};
    }
    const previous=this.db.prepare('SELECT COUNT(*) AS n,MAX(d.created) AS last FROM coach_deliveries d JOIN coach_suggestions s ON s.id=d.suggestion_id WHERE s.task=?').get(task);
    if(previous.n>=MAX_PER_TASK||previous.last!==null&&this.now()-previous.last<COOLDOWN_MS)return {status:'rate-limited'};
    const message=createUserMessage({source:{kind:'plugin',plugin:'taskwatch'},content:[{type:'text',text:row.body}]});
    const started=this.ledger.transaction(()=>{
      if(this.db.prepare('SELECT id FROM coach_deliveries WHERE suggestion_id=?').get(id))return false;
      this.db.prepare('INSERT INTO coach_deliveries VALUES (?,?,?,?,?,?)').run(randomUUID(),id,message.id,'attempting',this.now(),this.now());
      this.db.prepare("UPDATE coach_suggestions SET status='attempting',updated=? WHERE id=?").run(this.now(),id);return true;
    });
    if(!started)return {status:'already-attempted'};
    try{agent.steer(message);this.db.prepare("UPDATE coach_deliveries SET status='submitted',updated=? WHERE suggestion_id=?").run(this.now(),id);this.db.prepare("UPDATE coach_suggestions SET status='submitted',updated=? WHERE id=?").run(this.now(),id);return {status:'submitted',messageId:message.id};}
    catch{this.db.prepare("UPDATE coach_deliveries SET status='unknown',updated=? WHERE suggestion_id=?").run(this.now(),id);this.db.prepare("UPDATE coach_suggestions SET status='unknown',updated=? WHERE id=?").run(this.now(),id);return {status:'unknown'};}
  }
  observe(task,event){if(event?.type!=='user/message'||event.data?.source?.kind!=='plugin'||event.data.source.plugin!=='taskwatch')return false;const row=this.db.prepare('SELECT d.suggestion_id FROM coach_deliveries d JOIN coach_suggestions s ON s.id=d.suggestion_id WHERE s.task=? AND d.message_id=?').get(task,event.data.id);if(!row)return false;this.db.prepare("UPDATE coach_deliveries SET status='observed',updated=? WHERE suggestion_id=?").run(this.now(),row.suggestion_id);this.db.prepare("UPDATE coach_suggestions SET status='observed',updated=? WHERE id=?").run(this.now(),row.suggestion_id);return true;}
}

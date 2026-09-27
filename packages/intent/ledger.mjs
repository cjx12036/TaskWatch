import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, openSync, closeSync, lstatSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateProposal } from './schema.mjs';

const validId = value => { if(typeof value!=='string'||!value.trim()||value.length>512)throw new TypeError('Invalid id'); };
export class Ledger {
  constructor(path) {
    mkdirSync(dirname(path),{recursive:true,mode:0o700});
    try { closeSync(openSync(path,'wx',0o600)); } catch(error) {if(error.code!=='EEXIST')throw error;}
    const stat=lstatSync(path);
    if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077))throw new Error('Ledger requires a private regular file');
    this.db=new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;');
    const version=this.db.prepare('PRAGMA user_version').get().user_version;
    if(version!==0&&version!==1){this.close();throw new Error('Unsupported ledger version');}
    this.db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, session TEXT UNIQUE NOT NULL, version INTEGER NOT NULL DEFAULT 0, reviewed INTEGER NOT NULL DEFAULT 0, current_id TEXT, status TEXT NOT NULL DEFAULT 'empty');
      CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,task TEXT NOT NULL REFERENCES tasks(id),version INTEGER NOT NULL,seq INTEGER NOT NULL,message_id TEXT NOT NULL,text TEXT NOT NULL,complete INTEGER NOT NULL,UNIQUE(task,seq),UNIQUE(task,message_id),UNIQUE(task,version));
      CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY,task TEXT NOT NULL REFERENCES tasks(id),version INTEGER NOT NULL,status TEXT NOT NULL,body TEXT,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS extraction_calls(id INTEGER PRIMARY KEY,task TEXT NOT NULL REFERENCES tasks(id),version INTEGER NOT NULL,body TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS coverage_gaps(task TEXT PRIMARY KEY REFERENCES tasks(id),code TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS pending_questions(task TEXT PRIMARY KEY REFERENCES tasks(id),proposal TEXT NOT NULL REFERENCES proposals(id));
      PRAGMA user_version=1; COMMIT;`);
    if(!this.db.prepare('PRAGMA table_info(messages)').all().some(column=>column.name==='time'))this.db.exec('ALTER TABLE messages ADD COLUMN time INTEGER');
  }
  close(){if(this.db){this.db.close();this.db=null;}}
  transaction(fn){if(this.inTransaction)return fn();this.db.exec('BEGIN IMMEDIATE');this.inTransaction=true;try{const result=fn();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}finally{this.inTransaction=false;}}
  bind(taskId,sessionId){validId(taskId);validId(sessionId);return this.transaction(()=>{
    const prior=this.db.prepare('SELECT * FROM tasks WHERE id=? OR session=?').all(taskId,sessionId);
    if(prior.length){if(prior.length===1&&prior[0].id===taskId&&prior[0].session===sessionId)return this.snapshot(taskId);throw new Error('Task or session already bound');}
    this.db.prepare('INSERT INTO tasks(id,session) VALUES (?,?)').run(taskId,sessionId);return this.snapshot(taskId);
  });}
  ingest(sessionId,event){
    if(event.type!=='user/message'||event.data?.source?.kind!=='user')return false;
    const task=this.db.prepare('SELECT id FROM tasks WHERE session=?').get(sessionId);if(!task)return false;
    const {id,content}=event.data;validId(id);
    if(!Number.isSafeInteger(event.seq)||event.seq<0||!Array.isArray(content)||event.time!==undefined&&(!Number.isSafeInteger(event.time)||event.time<0))throw new Error('Invalid event');
    const complete=content.length>0&&content.every(b=>b.type==='text'&&typeof b.text==='string');
    const text=content.filter(b=>b.type==='text'&&typeof b.text==='string').map(b=>b.text).join('\n');
    if(Buffer.byteLength(text)>65536)throw new Error('User message exceeds ledger limit');
    return this.transaction(()=>{
      const old=this.db.prepare('SELECT * FROM messages WHERE task=? AND (seq=? OR message_id=?)').all(task.id,event.seq,id);
      if(old.length){if(old.length!==1||old[0].seq!==event.seq||old[0].message_id!==id||old[0].text!==text||old[0].complete!==Number(complete)||old[0].time!==null&&event.time!==undefined&&old[0].time!==event.time)throw new Error('Event conflict');if(old[0].time===null&&event.time!==undefined)this.db.prepare('UPDATE messages SET time=? WHERE id=?').run(event.time,old[0].id);return false;}
      const last=this.db.prepare('SELECT MAX(seq) AS seq FROM messages WHERE task=?').get(task.id);
      if(last.seq!==null&&event.seq<=last.seq)throw new Error('Out-of-order user evidence');
      this.db.prepare('UPDATE tasks SET version=version+1,status=? WHERE id=?').run(complete?'pending':'incomplete-evidence',task.id);
      const version=this.db.prepare('SELECT version FROM tasks WHERE id=?').get(task.id).version;
      this.db.prepare('INSERT INTO messages(id,task,version,seq,message_id,text,complete,time) VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(),task.id,version,event.seq,id,text,Number(complete),event.time??null);return true;
    });
  }
  snapshot(taskId){return this.transaction(()=>this.readSnapshot(taskId));}
  readSnapshot(taskId){
    const t=this.db.prepare('SELECT * FROM tasks WHERE id=?').get(taskId);if(!t)throw new Error('Unknown task');
    const messages=this.db.prepare('SELECT id,version,seq,message_id AS sourceMessageId,text,complete,time FROM messages WHERE task=? ORDER BY version').all(taskId).map(m=>({...m,complete:!!m.complete}));
    const p=t.current_id?this.db.prepare('SELECT * FROM proposals WHERE id=? AND task=?').get(t.current_id,taskId):null;
    const gap=this.db.prepare('SELECT code FROM coverage_gaps WHERE task=?').get(taskId);
    const unresolved=this.db.prepare('SELECT p.body FROM pending_questions q JOIN proposals p ON p.id=q.proposal WHERE q.task=?').get(taskId);
    const normalizeProposal=body=>{const proposal=JSON.parse(body);return {...proposal,implementationUnknowns:proposal.implementationUnknowns??[],sharedScopeHints:proposal.sharedScopeHints??[]};};
    return {taskId,sessionId:t.session,version:t.version,reviewedVersion:t.reviewed,status:gap||messages.some(m=>!m.complete)?'incomplete-evidence':t.status,coverageGap:gap?.code??null,
      messages,current:p?normalizeProposal(p.body):null,currentVersion:p?.version??null,questions:unresolved?normalizeProposal(unresolved.body).questions:[],interpretationOnly:true};
  }
  markGap(sessionId,code){const task=this.db.prepare('SELECT id FROM tasks WHERE session=?').get(sessionId);if(task)this.db.prepare('INSERT OR REPLACE INTO coverage_gaps VALUES (?,?)').run(task.id,code);}
  bindings(){return this.db.prepare('SELECT id AS taskId,session AS sessionId FROM tasks').all();}
  reconcile(taskId,session){
    const snapshot=this.snapshot(taskId);
    if(!session){this.markGap(snapshot.sessionId,'history-unverified');return;}
    const events=session.events;
    if((events[0]?.seq??0)>1||snapshot.messages.some(m=>!events.some(e=>e.seq===m.seq&&e.type==='user/message'&&e.data.id===m.sourceMessageId))){this.markGap(session.id,'history-unverified');return;}
    this.transaction(()=>{
      for(const event of events)this.ingest(session.id,event);
      this.db.prepare("DELETE FROM coverage_gaps WHERE task=? AND code='history-unverified'").run(taskId);
    });
  }
  commit(taskId,version,proposal){return this.transaction(()=>{
    const snapshot=this.snapshot(taskId);let status;
    if(snapshot.version!==version)status='stale';
    else if(snapshot.reviewedVersion>=version)status='already-reviewed';
    else if(snapshot.status==='incomplete-evidence')status='incomplete-evidence';
    else {
      proposal=validateProposal(proposal,snapshot.messages,snapshot.reviewedVersion);
      status=proposal.questions.length?'needs-clarification':proposal.updates.every(u=>u.kind==='inquiry')?'inquiry':'validated-proposal';
    }
    const id=randomUUID();
    this.db.prepare('INSERT INTO proposals VALUES (?,?,?,?,?,?)').run(id,taskId,version,status,['validated-proposal','needs-clarification','inquiry'].includes(status)?JSON.stringify(proposal):null,new Date().toISOString());
    if(['validated-proposal','needs-clarification','inquiry'].includes(status)){
      const taskStatus=status==='inquiry'&&snapshot.questions.length?'needs-clarification':status;
      this.db.prepare('UPDATE tasks SET reviewed=?,status=? WHERE id=?').run(version,taskStatus,taskId);
      if(status==='needs-clarification')this.db.prepare('INSERT OR REPLACE INTO pending_questions VALUES (?,?)').run(taskId,id);
      if(status==='validated-proposal'){
        this.db.prepare('UPDATE tasks SET current_id=? WHERE id=?').run(id,taskId);
        this.db.prepare('DELETE FROM pending_questions WHERE task=?').run(taskId);
      }
    }
    return {id,status,version};
  });}
  recordFailure(taskId,version,status,errorCode=null,diagnostics=null){
    if(!['failed','timeout','invalid-output','input-too-large'].includes(status))throw new Error('Invalid failure status');
    return this.transaction(()=>{const snap=this.snapshot(taskId);const effective=snap.version===version?status:'stale';
      const body=errorCode||diagnostics?JSON.stringify({...errorCode?{errorCode}:{},...diagnostics?{diagnostics}:{}}):null;
      this.db.prepare('INSERT INTO proposals VALUES (?,?,?,?,?,?)').run(randomUUID(),taskId,version,effective,body,new Date().toISOString());
      if(snap.version===version&&snap.reviewedVersion<version)this.db.prepare('UPDATE tasks SET status=? WHERE id=?').run(status,taskId);
      return {status:effective,version,...(errorCode?{errorCode}:{}),...(diagnostics?{diagnostics}:{})};});
  }
  recordExtractionCall(taskId,version,body){this.db.prepare('INSERT INTO extraction_calls(task,version,body,created) VALUES (?,?,?,?)').run(taskId,version,JSON.stringify(body),new Date().toISOString());}
  extractionCalls(taskId){this.snapshot(taskId);return this.db.prepare('SELECT version,body,created FROM extraction_calls WHERE task=? ORDER BY id').all(taskId).map(row=>({version:row.version,...JSON.parse(row.body),created:row.created}));}
  history(taskId){this.snapshot(taskId);return this.db.prepare('SELECT id,version,status,body,created FROM proposals WHERE task=? ORDER BY rowid').all(taskId).map(p=>{
    const body=p.body?JSON.parse(p.body):null;
    return {...p,body:body&&['validated-proposal','needs-clarification','inquiry'].includes(p.status)?{...body,implementationUnknowns:body.implementationUnknowns??[],sharedScopeHints:body.sharedScopeHints??[]}:body};
  });}
}

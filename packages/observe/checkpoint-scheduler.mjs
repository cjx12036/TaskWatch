/** Host-side checkpoint selection. It never decides whether evidence is a deviation. */
export class CheckpointScheduler {
 constructor({ledger,notify,isActive=()=>true,now=Date.now,setTimeout:schedule=setTimeout,clearTimeout:cancel=clearTimeout}){
  if(!ledger?.db||typeof notify!=='function')throw new TypeError('CheckpointScheduler requires a ledger and notify');
  this.db=ledger.db;this.notify=notify;this.isActive=isActive;this.now=now;this.schedule=schedule;this.cancel=cancel;this.timers=new Map();this.inflight=new Set();this.disposed=false;
  this.db.exec(`CREATE TABLE IF NOT EXISTS observe_checkpoints(
   task TEXT PRIMARY KEY REFERENCES tasks(id),last_seq INTEGER NOT NULL DEFAULT 0,last_material_seq INTEGER NOT NULL DEFAULT 0,
   last_at INTEGER,last_reason TEXT,pending_reason TEXT,pending_due INTEGER,side_waiting INTEGER NOT NULL DEFAULT 0,tool_start INTEGER
  )`);
 }
 row(task){this.db.prepare('INSERT OR IGNORE INTO observe_checkpoints(task) VALUES (?)').run(task);return this.db.prepare('SELECT * FROM observe_checkpoints WHERE task=?').get(task);}
 latest(task){return this.db.prepare("SELECT MAX(seq) AS seq FROM execution_events WHERE task=? AND type IN ('assistant/message','tool/result')").get(task).seq??0;}
 latestUser(task){return this.db.prepare('SELECT MAX(seq) AS seq FROM messages WHERE task=?').get(task).seq??0;}
 status(task){const r=this.row(task);return {lastReason:r.last_reason,lastCheckedAt:r.last_at,pendingReason:r.pending_reason,nextCheckAt:r.pending_due,waitingForCheckpoint:!!r.side_waiting,inFlight:this.inflight.has(task)};}
 sideUpdated(task){this.row(task);this.db.prepare('UPDATE observe_checkpoints SET side_waiting=1 WHERE task=?').run(task);}
 begin(task){if(!this.inflight.has(task))return;this.#clear(task);const seq=this.db.prepare('SELECT MAX(seq) AS seq FROM execution_events WHERE task=?').get(task).seq??0;this.db.prepare('UPDATE observe_checkpoints SET last_seq=?,last_material_seq=?,pending_reason=NULL,pending_due=NULL WHERE task=?').run(Math.max(seq,this.latestUser(task)),Math.max(this.latest(task),this.latestUser(task)),task);}
 seedFromReport(task,created){const r=this.row(task);if(r.last_at!==null)return;const seq=this.db.prepare('SELECT MAX(seq) AS seq FROM execution_events WHERE task=?').get(task).seq??0;const at=Date.parse(created);this.db.prepare('UPDATE observe_checkpoints SET last_seq=?,last_material_seq=?,last_at=?,last_reason=? WHERE task=?').run(Math.max(seq,this.latestUser(task)),Math.max(this.latest(task),this.latestUser(task)),Number.isFinite(at)?at:this.now(),'restored-report',task);}
 pause(task){this.#clear(task);}
 flush(task){if(this.disposed||!this.isActive(task))return false;this.#clear(task);this.#dispatch(task);return this.inflight.has(task);}
 restore(task){if(this.disposed)return;const r=this.row(task);if(!this.isActive(task))return;
  if(r.pending_reason){this.#arm(task);return;}
  const user=this.latestUser(task),material=this.latest(task);
  if(material>r.last_material_seq&&material>user){const last=this.db.prepare("SELECT type FROM execution_events WHERE task=? AND seq=?").get(task,material);const ended=this.db.prepare("SELECT seq FROM execution_events WHERE task=? AND type='turn/end' AND seq>? ORDER BY seq DESC LIMIT 1").get(task,material);
   if(last?.type==='assistant/message')this.#queue(task,'assistant',this.now()+2000);else if(ended)this.#queue(task,'turn-end',this.now()+2000);else this.#maybeToolBatch(task);}
  else if(user>r.last_seq)this.#queue(task,'user',this.now()+750);
 }
 event(task,seq,type){if(this.disposed||!this.isActive(task))return;const r=this.row(task);if(seq<=r.last_seq)return;
  if(type==='user/message'){this.#queue(task,'user',this.now()+750);return;}
  if(type==='assistant/message'){
   const row=this.db.prepare('SELECT body FROM execution_events WHERE task=? AND seq=?').get(task,seq);
   if(row&&typeof JSON.parse(row.body).text==='string'&&JSON.parse(row.body).text.trim())this.#queue(task,'assistant',this.now()+2000);
   return;
  }
  if(type==='tool/result'){
   if(this.#repeatedFailure(task,seq)){this.#queue(task,'repeated-failure',this.now()+2000);return;}
   this.#maybeToolBatch(task);return;
  }
  if(type==='turn/end'){
   if(this.latest(task)<=r.last_material_seq&&this.latestUser(task)<=r.last_seq)return;
   if(r.pending_reason==='assistant'||r.pending_reason==='repeated-failure')return;
   this.#queue(task,'turn-end',this.now()+2000);
  }
 }
 complete(task,report){this.inflight.delete(task);if(this.disposed)return;const r=this.row(task);const newest=this.db.prepare('SELECT MAX(seq) AS seq FROM execution_events WHERE task=?').get(task).seq??0;
  if(r.pending_reason&&this.isActive(task))this.#arm(task);else if(this.isActive(task)&&report?.status==='stale'&&Math.max(newest,this.latestUser(task))>r.last_seq){
   const material=this.latest(task),row=this.db.prepare('SELECT type FROM execution_events WHERE task=? AND seq=?').get(task,material);
   if(this.latestUser(task)>newest)this.#queue(task,'user',this.now()+750);
   else if(material>r.last_material_seq&&row?.type==='assistant/message')this.#queue(task,'assistant',Math.max(this.now()+2000,(r.last_at??0)+30000));else this.#queue(task,'stale-refresh',Math.max(this.now()+2000,(r.last_at??0)+30000));
  }}
 #maybeToolBatch(task){const r=this.row(task);const count=this.db.prepare("SELECT COUNT(*) AS n,MIN(seq) AS first FROM execution_events WHERE task=? AND type='tool/result' AND seq>?").get(task,r.last_seq);
  if(count.n>0&&r.tool_start===null)this.db.prepare('UPDATE observe_checkpoints SET tool_start=? WHERE task=?').run(this.now(),task);
  if(count.n<12)return;
  const start=this.row(task).tool_start;this.#queue(task,'tool-batch',Math.max(this.now(),start+180000,(r.last_at??0)+180000));
 }
 #repeatedFailure(task,seq){const rows=this.db.prepare("SELECT e.body AS result,(SELECT c.body FROM execution_events c WHERE c.task=e.task AND c.type='tool/call' AND c.seq<e.seq AND json_extract(c.body,'$.callId')=json_extract(e.body,'$.callId') ORDER BY c.seq DESC LIMIT 1) AS call FROM execution_events e WHERE e.task=? AND e.type='tool/result' AND e.seq<=? ORDER BY e.seq DESC LIMIT 2").all(task,seq);
  if(rows.length!==2)return false;const [a,b]=rows.map(row=>({error:JSON.parse(row.result).isError,call:row.call?JSON.parse(row.call):null}));return a.error===true&&b.error===true&&a.call&&b.call&&a.call.name===b.call.name&&a.call.arguments===b.call.arguments;
 }
 #queue(task,reason,due){const r=this.row(task);const priority={user:1,'tool-batch':2,'turn-end':3,'stale-refresh':3,assistant:4,'repeated-failure':5};if(r.pending_reason&&priority[r.pending_reason]>priority[reason])return;
  if(reason!=='user')due=Math.max(due,(r.last_at??-Infinity)+30000);
  if(r.pending_reason===reason&&r.pending_due!==null)due=reason==='assistant'?due:Math.min(due,r.pending_due);
  this.db.prepare('UPDATE observe_checkpoints SET pending_reason=?,pending_due=? WHERE task=?').run(reason,due,task);this.#arm(task);
 }
 #clear(task){const timer=this.timers.get(task);if(timer!==undefined){this.cancel(timer);this.timers.delete(task);}}
 #arm(task){this.#clear(task);if(this.disposed||this.inflight.has(task)||!this.isActive(task))return;const r=this.row(task);if(!r.pending_reason)return;
  const timer=this.schedule(()=>{this.timers.delete(task);this.#dispatch(task);},Math.max(0,r.pending_due-this.now()));timer?.unref?.();this.timers.set(task,timer);
 }
 #dispatch(task){if(this.disposed||this.inflight.has(task)||!this.isActive(task))return;const r=this.row(task);if(!r.pending_reason)return;
  const seq=this.db.prepare('SELECT MAX(seq) AS seq FROM execution_events WHERE task=?').get(task).seq??0;
  const material=Math.max(this.latest(task),this.latestUser(task));
  if(seq<=r.last_seq&&material<=r.last_material_seq){this.db.prepare('UPDATE observe_checkpoints SET pending_reason=NULL,pending_due=NULL WHERE task=?').run(task);return;}
  this.db.prepare('UPDATE observe_checkpoints SET last_seq=?,last_material_seq=?,last_at=?,last_reason=?,pending_reason=NULL,pending_due=NULL,side_waiting=?,tool_start=NULL WHERE task=?').run(Math.max(seq,this.latestUser(task)),material,this.now(),r.pending_reason,r.pending_reason==='user'?r.side_waiting:0,task);
  this.inflight.add(task);try{if(this.notify(task,r.pending_reason)===false)this.inflight.delete(task);}catch{this.inflight.delete(task);}
 }
 dispose(){this.disposed=true;for(const task of this.timers.keys())this.#clear(task);this.inflight.clear();}
}

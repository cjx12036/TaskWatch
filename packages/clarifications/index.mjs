import { createHash, randomUUID } from 'node:crypto';

const states=new Set(['pending','answering','answered','dismissed','stale']);
const id=value=>typeof value==='string'&&value.trim()&&value.length<=512;
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const text=(value,name)=>{if(typeof value!=='string'||!value.trim()||Buffer.byteLength(value)>4000)throw new TypeError(`Invalid ${name}`);return value;};
function refs(value,name,{empty=false}={}){
 if(!Array.isArray(value)||(empty?false:!value.length)||value.length>120||new Set(value).size!==value.length||value.some(item=>!id(item)))throw new TypeError(`Invalid ${name}`);
 return [...value];
}
function revision(value){
 if(!value||typeof value!=='object'||!integer(value.mainVersion)||!integer(value.sideVersion)||(value.throughSeq!==null&&!integer(value.throughSeq)))throw new TypeError('Invalid card revision');
 return {mainVersion:value.mainVersion,throughSeq:value.throughSeq,sideVersion:value.sideVersion};
}
function tradeoff(finding){
 if(!finding||finding.category!=='tradeoff'||!finding.tradeoff||typeof finding.tradeoff!=='object')return null;
 const body=finding.tradeoff;
 if(!['proposal','execution'].includes(body.basis))return null;
 try {
  const value={category:'tradeoff',requirementIds:refs(finding.requirementIds,'requirement IDs'),evidenceIds:refs(finding.evidenceIds,'evidence IDs'),tradeoff:{basis:body.basis,impact:text(body.impact,'impact'),question:text(body.question,'question')}};
  if(finding.userMessageIds!==undefined)value.userMessageIds=refs(finding.userMessageIds,'user message IDs');
  return value;
 } catch { return null; }
}
function subject(value){return createHash('sha256').update(JSON.stringify({category:value.category,requirementIds:[...value.requirementIds].sort(),evidenceIds:[...value.evidenceIds].sort()})).digest('hex');}
function decode(row){return {...row,requirementIds:JSON.parse(row.requirement_ids),evidenceIds:JSON.parse(row.evidence_ids),userMessageIds:row.user_message_ids?JSON.parse(row.user_message_ids):undefined,tradeoff:JSON.parse(row.tradeoff),deferredUntil:row.deferred_until,answer:row.answer,answerStatus:row.answer_status};}

/** Local, supervisor-only clarification inbox. It never carries authority to the main task. */
export class ClarificationCards {
 constructor(ledger){
  if(!ledger?.db||typeof ledger.snapshot!=='function'||typeof ledger.transaction!=='function')throw new TypeError('ClarificationCards requires a Ledger');this.ledger=ledger;
  ledger.db.exec(`CREATE TABLE IF NOT EXISTS clarification_cards(
   id TEXT PRIMARY KEY, task TEXT NOT NULL REFERENCES tasks(id), report_id TEXT NOT NULL, subject TEXT NOT NULL,
   category TEXT NOT NULL, requirement_ids TEXT NOT NULL, evidence_ids TEXT NOT NULL, user_message_ids TEXT, tradeoff TEXT NOT NULL,
   main_version INTEGER NOT NULL, through_seq INTEGER, side_version INTEGER NOT NULL, status TEXT NOT NULL,
   deferred_until TEXT, answer TEXT, answer_status TEXT, created TEXT NOT NULL, updated TEXT NOT NULL,
   UNIQUE(task,subject,main_version,through_seq,side_version)
  ); CREATE INDEX IF NOT EXISTS clarification_cards_task_status ON clarification_cards(task,status,created);`);
  // Early development builds used UNIQUE(task,subject), which prevented a
  // stale card from being reopened after relevant evidence changed.
  const unique=ledger.db.prepare('PRAGMA index_list(clarification_cards)').all().find(row=>row.unique&&ledger.db.prepare(`PRAGMA index_info(${row.name})`).all().map(column=>column.name).join(',')==='task,subject');
  if(unique)ledger.db.exec(`BEGIN IMMEDIATE;
   CREATE TABLE clarification_cards_next(
    id TEXT PRIMARY KEY, task TEXT NOT NULL REFERENCES tasks(id), report_id TEXT NOT NULL, subject TEXT NOT NULL,
    category TEXT NOT NULL, requirement_ids TEXT NOT NULL, evidence_ids TEXT NOT NULL, user_message_ids TEXT, tradeoff TEXT NOT NULL,
    main_version INTEGER NOT NULL, through_seq INTEGER, side_version INTEGER NOT NULL, status TEXT NOT NULL,
    deferred_until TEXT, answer TEXT, answer_status TEXT, created TEXT NOT NULL, updated TEXT NOT NULL,
    UNIQUE(task,subject,main_version,through_seq,side_version)
   ); INSERT INTO clarification_cards_next SELECT * FROM clarification_cards;
   DROP TABLE clarification_cards; ALTER TABLE clarification_cards_next RENAME TO clarification_cards;
   CREATE INDEX clarification_cards_task_status ON clarification_cards(task,status,created); COMMIT;`);
  ledger.db.prepare("UPDATE clarification_cards SET status='pending',answer_status='interrupted',updated=? WHERE status='answering'").run(new Date().toISOString());
 }
 list(taskId){this.ledger.snapshot(taskId);return this.ledger.db.prepare('SELECT * FROM clarification_cards WHERE task=? ORDER BY rowid').all(taskId).map(decode);}
 current(taskId,now=Date.now()){
  this.ledger.snapshot(taskId);const row=this.ledger.db.prepare("SELECT * FROM clarification_cards WHERE task=? AND (status='answering' OR (status='pending' AND (deferred_until IS NULL OR deferred_until<=?))) ORDER BY CASE status WHEN 'answering' THEN 0 ELSE 1 END,rowid LIMIT 1").get(taskId,new Date(now).toISOString());return row?decode(row):null;
 }
 collect(taskId,reportId,report,revisionValue){
  if(!id(taskId)||!id(reportId))throw new TypeError('Invalid card task or report');const rev=revision(revisionValue);const indexes=report?.result?.notification?.findingIndexes;
  if(!Array.isArray(indexes))return [];
  const findings=report?.result?.findings;if(!Array.isArray(findings))return [];
  return this.ledger.transaction(()=>{
   this.ledger.snapshot(taskId);this.markStale(taskId,rev);const made=[];
   for(const index of indexes){if(!Number.isSafeInteger(index)||index<0||index>=findings.length)continue;const value=tradeoff(findings[index]);if(!value)continue;const key=subject(value);
    // Answered/dismissed subjects stay resolved. A stale subject can reopen only
    // for a different evidence revision; generated question wording is ignored.
    const existing=this.ledger.db.prepare('SELECT status,main_version,through_seq,side_version,deferred_until FROM clarification_cards WHERE task=? AND subject=? ORDER BY rowid DESC').all(taskId,key);
    if(existing.some(row=>['answered','dismissed'].includes(row.status))||existing.some(row=>row.status!=='stale')||existing.some(row=>row.main_version===rev.mainVersion&&row.through_seq===rev.throughSeq&&row.side_version===rev.sideVersion))continue;
    const deferredUntil=existing.find(row=>row.deferred_until&&Date.parse(row.deferred_until)>Date.now())?.deferred_until??null;
    const stamp=new Date().toISOString(),item={id:randomUUID(),taskId,reportId,subject:key,...value,...rev,status:'pending',deferredUntil,answer:null,answerStatus:null,created:stamp,updated:stamp};
    this.ledger.db.prepare('INSERT INTO clarification_cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(item.id,taskId,reportId,key,item.category,JSON.stringify(item.requirementIds),JSON.stringify(item.evidenceIds),item.userMessageIds?JSON.stringify(item.userMessageIds):null,JSON.stringify(item.tradeoff),rev.mainVersion,rev.throughSeq,rev.sideVersion,item.status,deferredUntil,null,null,stamp,stamp);made.push(item);
   } return made;
  });
 }
 markStale(taskId,revisionValue){const rev=revision(revisionValue);return this.ledger.transaction(()=>{this.ledger.snapshot(taskId);return this.ledger.db.prepare("UPDATE clarification_cards SET status='stale',updated=? WHERE task=? AND status IN ('pending','answering') AND (main_version<>? OR side_version<>? OR through_seq IS NOT ?)").run(new Date().toISOString(),taskId,rev.mainVersion,rev.sideVersion,rev.throughSeq).changes;});}
 defer(taskId,cardId,until){if(!id(cardId)||typeof until!=='string'||Number.isNaN(Date.parse(until)))throw new TypeError('Invalid defer');return this.ledger.transaction(()=>{this.ledger.snapshot(taskId);return !!this.ledger.db.prepare("UPDATE clarification_cards SET deferred_until=?,updated=? WHERE task=? AND id=? AND status='pending'").run(until,new Date().toISOString(),taskId,cardId).changes;});}
 dismiss(taskId,cardId){if(!id(cardId))throw new TypeError('Invalid card');return this.ledger.transaction(()=>{this.ledger.snapshot(taskId);return !!this.ledger.db.prepare("UPDATE clarification_cards SET status='dismissed',updated=? WHERE task=? AND id=? AND status IN ('pending','answering')").run(new Date().toISOString(),taskId,cardId).changes;});}
 beginAnswer(taskId,cardId,revisionValue,rawAnswer){const rev=revision(revisionValue);text(rawAnswer,'answer');return this.ledger.transaction(()=>{this.ledger.snapshot(taskId);const result=this.ledger.db.prepare("UPDATE clarification_cards SET status='answering',answer=?,answer_status='answering',updated=? WHERE task=? AND id=? AND status='pending' AND main_version=? AND through_seq IS ? AND side_version=?").run(rawAnswer,new Date().toISOString(),taskId,cardId,rev.mainVersion,rev.throughSeq,rev.sideVersion);return !!result.changes;});}
 finishAnswer(taskId,cardId,revisionValue,result){const rev=revision(revisionValue);return this.ledger.transaction(()=>{this.ledger.snapshot(taskId);const row=this.ledger.db.prepare('SELECT * FROM clarification_cards WHERE task=? AND id=?').get(taskId,cardId);if(!row)throw new Error('Unknown clarification card');const card=decode(row);if(card.status==='answered'||card.status==='dismissed'||card.status==='stale')return card;
   const current=card.main_version===rev.mainVersion&&card.through_seq===rev.throughSeq&&card.side_version===rev.sideVersion;
   const successful=result?.status==='corrected';const status=current&&successful?'answered':current?'pending':'stale';
   const raw=typeof result?.rawAnswer==='string'?result.rawAnswer:card.answer;const answerStatus=successful?'corrected':typeof result?.status==='string'?result.status:'failed';
   this.ledger.db.prepare('UPDATE clarification_cards SET status=?,answer=?,answer_status=?,updated=? WHERE task=? AND id=?').run(status,raw,answerStatus,new Date().toISOString(),taskId,cardId);
   return decode(this.ledger.db.prepare('SELECT * FROM clarification_cards WHERE task=? AND id=?').get(taskId,cardId));
  });}
 get(taskId,cardId){this.ledger.snapshot(taskId);const row=this.ledger.db.prepare('SELECT * FROM clarification_cards WHERE task=? AND id=?').get(taskId,cardId);return row?decode(row):null;}
}

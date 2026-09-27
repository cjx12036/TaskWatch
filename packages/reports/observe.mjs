import { createHash, randomUUID } from 'node:crypto';

// Local user inbox, never part of the observed session's messages.
export class ObserveReports {
  constructor(ledger) {
    this.ledger=ledger;
    ledger.db.exec(`CREATE TABLE IF NOT EXISTS observe_starts(task TEXT PRIMARY KEY REFERENCES tasks(id),config TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS observe_reports(id TEXT PRIMARY KEY,task TEXT NOT NULL REFERENCES tasks(id),revision TEXT NOT NULL,fingerprint TEXT NOT NULL,body TEXT NOT NULL,created TEXT NOT NULL,dismissed INTEGER NOT NULL DEFAULT 0,UNIQUE(task,revision,fingerprint));`);
  }
  start(task,config) {
    if(this.state(task))throw new Error('Observe already started for this task; automatic budget reset is forbidden');
    this.ledger.db.prepare('INSERT INTO observe_starts VALUES (?,?,?)').run(task,JSON.stringify(config),new Date().toISOString());
  }
  state(task) {
    const row=this.ledger.db.prepare('SELECT config,created FROM observe_starts WHERE task=?').get(task);
    return row?{status:'paused-after-restart',config:JSON.parse(row.config),created:row.created}:null;
  }
  publish(task,revision,report) {
    // Transport IDs and timestamps must not defeat equivalent-report deduplication.
    const canonical={status:report.status,result:report.result?{findings:report.result.findings,notification:report.result.notification,progress:report.result.progress,errorCode:report.result.errorCode,validation:report.result.validation}:null};
    const fingerprint=createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
    const item={id:randomUUID(),taskId:task,revision,report:structuredClone(report),created:new Date().toISOString(),dismissed:false};
    const result=this.ledger.db.prepare('INSERT OR IGNORE INTO observe_reports VALUES (?,?,?,?,?,?,0)').run(item.id,task,revision,fingerprint,JSON.stringify(report),item.created);
    return result.changes?item:null;
  }
  list(task) {
    return this.ledger.db.prepare('SELECT * FROM observe_reports WHERE task=? ORDER BY rowid').all(task).map(row=>({id:row.id,taskId:row.task,revision:row.revision,report:JSON.parse(row.body),created:row.created,dismissed:!!row.dismissed}));
  }
  dismiss(task,id) {return !!this.ledger.db.prepare('UPDATE observe_reports SET dismissed=1 WHERE task=? AND id=?').run(task,id).changes;}
}
export function renderReport(item) {
  const r=item.report;
  const lines=[`TaskWatch · ${item.taskId} · ${item.current===false?'stale（历史结果）':r.status}`,`时间：${item.created} · ${item.dismissed?'已驳回':'未驳回'}`,`报告 ID：${item.id}`];
  if(r.history)lines.push(`证据范围：${r.history.includedEvents}/${r.history.totalEvents} 条；省略 ${r.history.omittedEvents} 条；截取 ${r.history.truncatedEvents} 条。${r.history.partial?'仅对本次可见证据作判断。':'覆盖当前目标的已记录公开事件。'}`);
  const validation=r.result?.validation;
  if(r.status==='assessed-incomplete'||validation?.complete===false){
    lines.push('评估不完整：仅展示已通过验证的项目；被拒绝的模型输出不会作为监督结论。');
    for(const rejected of validation?.rejected??[])if(rejected&&typeof rejected.kind==='string'&&Number.isSafeInteger(rejected.index)&&typeof rejected.errorCode==='string')lines.push(`被拒项 ${rejected.kind} #${rejected.index}：${rejected.errorCode}`);
  }
  const findings=r.result?.findings??[];
  const notification=r.result?.notification??{shouldNotify:findings.length>0,findingIndexes:findings.map((_,index)=>index)};
  const reminderIndexes=new Set(notification.findingIndexes);
  if(r.status.startsWith('assessed')&&!notification.shouldNotify)lines.push('本次无需提醒；这不表示整个任务已经完成或得到验证。');
  for(const [index,f] of findings.entries())if(reminderIndexes.has(index))lines.push(`\n[${f.category}]`,`观察：${f.observation}`,`推断：${f.interpretation}`,`建议：${f.suggestion}`,`执行依据：${f.evidenceIds.join(', ')||'缺失'}`,...(f.userMessageIds?.length?[`用户原话：${f.userMessageIds.join(', ')}`]:[]));
  const audits=findings.filter((_,index)=>!reminderIndexes.has(index));
  if(audits.length)lines.push('\n审计记录（未作为提醒）：',...audits.map(f=>`[${f.category}] ${f.observation}`));
  const suppliedProgress=new Set(r.result?.progressCoverage?.suppliedRequirementIds??(r.result?.progress??[]).map(p=>p.requirementId));
  for(const p of r.result?.progress??[])if(suppliedProgress.has(p.requirementId))lines.push(`要求 ${p.requirementId}：${p.status}`);
  if(!r.result?.findings)lines.push('本次没有可用监督判断；请查看上述状态。');
  return lines.join('\n');
}

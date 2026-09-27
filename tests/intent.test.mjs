import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Ledger } from '../packages/intent/ledger.mjs';
import { validateProposal, EXTRACTION_INSTRUCTIONS } from '../packages/intent/schema.mjs';
const event = (id, text) => ({ seq: id, type: 'user/message', data: { id: `m${id}`, source: { kind: 'user' }, content: [{ type:'text', text }] } });
const proposal = (ref, quote, followupType = 'supplement') => ({ followupType, updates:[{messageId:ref,kind:followupType}], goal:{text:quote, evidence:[{messageId:ref,quote}]}, requirements:[], acceptance:[], constraints:[], exclusions:[], inferences:[], questions:[] });
test('normal extraction prompt names the exact shared layer enum',()=>{assert.match(EXTRACTION_INSTRUCTIONS,/layer MUST be exactly "project" or "phase"/);});
function fixture(fn) { const dir=mkdtempSync(join(tmpdir(),'taskwatch-ledger-'));const path=join(dir,'ledger.sqlite'); const ledger=new Ledger(path);try {return fn(ledger,path);} finally {ledger.close();rmSync(dir,{recursive:true,force:true});} }
test('ledger persists user evidence, deduplicates and isolates bound tasks across restart', () => fixture((l,path) => {
  l.bind('a','session-a'); l.bind('b','session-b');
  assert.equal(l.ingest('session-other',event(1,'private')), false);
  l.ingest('session-a',event(1,'只写计划'));l.ingest('session-a',event(1,'只写计划'));
  l.ingest('session-b',event(1,'另一个任务'));
  assert.equal(l.snapshot('a').version,1);
  assert.throws(()=>l.ingest('session-a',event(1,'不同原文')),/conflict/);
  assert.throws(()=>l.bind('c','session-a'),/bound/);
  const ref=l.snapshot('a').messages[0].id;
  l.commit('a',1,proposal(ref,'只写计划'));
  l.close(); const reopened=new Ledger(path);
  try {assert.equal(reopened.snapshot('a').current.goal.text,'只写计划');assert.equal(reopened.snapshot('a').messages.length,1);} finally {reopened.close();}
}));
test('stale, foreign and fabricated evidence cannot update an interpretation',()=>fixture(l=>{
  l.bind('a','a');l.bind('b','b');l.ingest('a',event(1,'写计划'));l.ingest('b',event(1,'改代码'));
  const ref=l.snapshot('a').messages[0].id;
  const foreign=proposal(l.snapshot('b').messages[0].id,'改代码');foreign.updates=[{messageId:ref,kind:'supplement'}];
  assert.throws(()=>l.commit('a',1,foreign),/evidence/);
  assert.throws(()=>l.commit('a',1,proposal(ref,'部署上线')),/evidence/);
  l.ingest('a',event(2,'只分析'));
  assert.equal(l.commit('a',1,proposal(ref,'写计划')).status,'stale');
  assert.equal(l.snapshot('a').current,null);
}));
test('inquiry and ambiguity retain current interpretation without promoting inference',()=>fixture(l=>{
  l.bind('a','a');l.ingest('a',event(1,'写计划'));const ref=l.snapshot('a').messages[0].id;
  l.commit('a',1,proposal(ref,'写计划'));
  l.ingest('a',event(2,'进展如何'));let p=proposal(ref,'写计划','inquiry');
  p.updates=[{messageId:l.snapshot('a').messages.at(-1).id,kind:'inquiry'}];
  assert.equal(l.commit('a',2,p).status,'inquiry');
  assert.equal(l.snapshot('a').currentVersion,1);
  l.ingest('a',event(3,'按刚才那个做'));p=proposal(ref,'写计划','clarification');p.questions=['“那个”指什么？'];
  p.updates=[{messageId:l.snapshot('a').messages.at(-1).id,kind:'clarification'}];
  assert.equal(l.commit('a',3,p).status,'needs-clarification');
  assert.equal(l.snapshot('a').currentVersion,1);
  assert.equal(l.snapshot('a').status,'needs-clarification');
  l.ingest('a',event(4,'进展呢'));p=proposal(ref,'写计划','inquiry');p.updates=[{messageId:l.snapshot('a').messages.at(-1).id,kind:'inquiry'}];
  l.commit('a',4,p);assert.equal(l.snapshot('a').status,'needs-clarification');assert.equal(l.snapshot('a').questions.length,1);
}));
test('non-user events never authorize changes; unsupported content is an explicit coverage gap',()=>fixture(l=>{
  l.bind('a','a');const e=event(1,'修改代码');e.data.source={kind:'plugin',plugin:'other'};
  assert.equal(l.ingest('a',e),false);assert.equal(l.snapshot('a').version,0);
  const image=event(2,'看图');image.data.content.push({type:'image',url:'private'});l.ingest('a',image);
  assert.equal(l.snapshot('a').status,'incomplete-evidence');
  assert.equal(JSON.stringify(l.snapshot('a')).includes('private'),false);
}));

test('a batched replacement followed by inquiry is not discarded',()=>fixture(l=>{
  l.bind('a','a');l.ingest('a',event(1,'写计划'));let s=l.snapshot('a');l.commit('a',1,proposal(s.messages[0].id,'写计划'));
  l.ingest('a',event(2,'改成只分析'));l.ingest('a',event(3,'进展如何'));s=l.snapshot('a');
  const p=proposal(s.messages[1].id,'改成只分析','inquiry');
  p.updates=[{messageId:s.messages[1].id,kind:'replacement'},{messageId:s.messages[2].id,kind:'inquiry'}];
  assert.equal(l.commit('a',3,p).status,'validated-proposal');assert.equal(l.snapshot('a').current.goal.text,'改成只分析');
}));

test('separate process writes remain visible and invalidate older snapshots',()=>fixture((l,path)=>{
  l.bind('a','a');l.ingest('a',event(1,'写计划'));const ref=l.snapshot('a').messages[0].id;
  const moduleUrl=new URL('../packages/intent/ledger.mjs',import.meta.url).href;
  const code=`import {Ledger} from ${JSON.stringify(moduleUrl)};const l=new Ledger(process.argv[1]);l.ingest('a',${JSON.stringify(event(2,'只分析'))});l.close();`;
  execFileSync(process.execPath,['--input-type=module','-e',code,path],{env:{PATH:process.env.PATH},timeout:5000});
  assert.equal(l.snapshot('a').version,2);assert.equal(l.commit('a',1,proposal(ref,'写计划')).status,'stale');
}));

test('legacy stored proposals read implementation unknowns as empty without rewriting raw history',()=>fixture(l=>{
  l.bind('a','a');l.ingest('a',event(1,'写计划'));const message=l.snapshot('a').messages[0];const committed=l.commit('a',1,proposal(message.id,'写计划'));
  const raw=JSON.parse(l.db.prepare('SELECT body FROM proposals WHERE id=?').get(committed.id).body);delete raw.implementationUnknowns;
  l.db.prepare('UPDATE proposals SET body=? WHERE id=?').run(JSON.stringify(raw),committed.id);
  assert.deepEqual(l.snapshot('a').current.implementationUnknowns,[]);assert.deepEqual(l.history('a')[0].body.implementationUnknowns,[]);
  assert.equal('implementationUnknowns' in JSON.parse(l.db.prepare('SELECT body FROM proposals WHERE id=?').get(committed.id).body),false);
}));
test('user event time is retained, and a legacy missing time stays unknown until reconciled',()=>fixture((l,path)=>{
  l.bind('a','a');const first=event(1,'项目长期要减少无用功');first.time=123456;
  l.ingest('a',first);
  assert.equal(l.snapshot('a').messages[0].time,123456);
  l.db.prepare('UPDATE messages SET time=NULL WHERE task=?').run('a');
  assert.equal(l.snapshot('a').messages[0].time,null);
  l.reconcile('a',{id:'a',events:[first]});
  assert.equal(l.snapshot('a').messages[0].time,123456);
}));
test('shared scope hints cite exact current-task user text and old proposals normalize empty',()=>fixture(l=>{
  l.bind('a','a');l.ingest('a',event(1,'这个项目始终要减少无用功'));
  const m=l.snapshot('a').messages[0];const value={...proposal(m.id,m.text),sharedScopeHints:[{layer:'project',messageId:m.id,quote:'这个项目始终要减少无用功'}]};
  assert.equal(validateProposal(value,[m]).sharedScopeHints.length,1);
  assert.throws(()=>validateProposal({...value,sharedScopeHints:[{layer:'phase',messageId:m.id,quote:'不存在'}]},[m]),/scope|evidence/i);
  assert.throws(()=>validateProposal({...value,sharedScopeHints:[{layer:'task',messageId:m.id,quote:m.text}]},[m]),/scope/i);
  assert.equal(l.commit('a',1,value).status,'validated-proposal');
  const raw=JSON.parse(l.db.prepare('SELECT body FROM proposals ORDER BY rowid DESC LIMIT 1').get().body);delete raw.sharedScopeHints;
  l.db.prepare('UPDATE proposals SET body=? WHERE task=?').run(JSON.stringify(raw),'a');
  assert.deepEqual(l.snapshot('a').current.sharedScopeHints,[]);
}));

test('proposal bounds the new implementation unknowns field independently',()=>fixture(l=>{
  l.bind('a','a');l.ingest('a',event(1,'写计划'));const message=l.snapshot('a').messages[0];const p=proposal(message.id,'写计划');
  p.implementationUnknowns=Array.from({length:13},(_,index)=>({text:`未知项 ${index}`,evidence:[{messageId:message.id,quote:'写计划'}]}));
  assert.throws(()=>l.commit('a',1,p),/Invalid intent list/);
}));

test('proposal rejects null or undefined lists except an absent legacy implementation unknowns field',()=>fixture(l=>{
  l.bind('a','a');l.ingest('a',event(1,'写计划'));const message=l.snapshot('a').messages[0];
  for(const key of ['requirements','acceptance','constraints','exclusions','inferences']){
    const p=proposal(message.id,'写计划');p[key]=null;assert.throws(()=>l.commit('a',1,p),/Invalid intent list/);
    p[key]=undefined;assert.throws(()=>l.commit('a',1,p),/Invalid intent list/);
  }
  for(const value of [null,undefined]){const p=proposal(message.id,'写计划');p.implementationUnknowns=value;assert.throws(()=>l.commit('a',1,p),/Invalid intent list/);}
  assert.equal(l.commit('a',1,proposal(message.id,'写计划')).status,'validated-proposal');
}));

test('proposal accepts ninety commitments but explicitly rejects more than 256 total claims',()=>fixture(l=>{
  l.bind('a','a');l.ingest('a',event(1,'写计划'));const message=l.snapshot('a').messages[0];const claim=index=>({text:`承诺 ${index}`,evidence:[{messageId:message.id,quote:'写计划'}]});
  const accepted=proposal(message.id,'写计划');accepted.requirements=Array.from({length:90},(_,index)=>claim(index));assert.equal(l.commit('a',1,accepted).status,'validated-proposal');
  const rejected={...accepted,requirements:Array.from({length:128},(_,index)=>claim(index)),acceptance:Array.from({length:128},(_,index)=>claim(index+128))};
  l.bind('b','b');l.ingest('b',event(1,'写计划'));const other=l.snapshot('b').messages[0];rejected.updates=[{messageId:other.id,kind:'supplement'}];rejected.goal={text:'写计划',evidence:[{messageId:other.id,quote:'写计划'}]};for(const key of ['requirements','acceptance'])rejected[key]=rejected[key].map((entry,index)=>({text:entry.text,evidence:[{messageId:other.id,quote:'写计划'}]}));
  assert.throws(()=>l.commit('b',1,rejected),/Too many intent claims/);
}));

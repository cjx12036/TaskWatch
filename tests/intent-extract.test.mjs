import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Ledger } from '../packages/intent/ledger.mjs';
import { extractIntent } from '../packages/intent/extract.mjs';
import { EXTRACTION_INSTRUCTIONS } from '../packages/intent/schema.mjs';
const event=(seq,text)=>({seq,type:'user/message',data:{id:`m${seq}`,source:{kind:'user'},content:[{type:'text',text}]}});
async function fixture(fn){const dir=mkdtempSync(join(tmpdir(),'intent-extract-'));const l=new Ledger(join(dir,'db'));l.bind('task','s');l.ingest('s',event(1,'只分析原因'));try{await fn(l);}finally{l.close();rmSync(dir,{recursive:true,force:true});}}
function proposal(message,kind='supplement',questions=[],sourceId=message.id){return {followupType:kind,updates:[{messageId:message.id,kind}],goal:{text:'只分析原因',evidence:[{messageId:sourceId,quote:'只分析原因'}]},requirements:[],acceptance:[],constraints:[],exclusions:[],inferences:[],questions};}
test('extractor sends only cited user evidence and validates returned interpretation',()=>fixture(async l=>{
  const result=await extractIntent(l,'task',async options=>{
    const m=options.input.messages[0];assert.equal(m.text,'只分析原因');
    return {status:'completed',value:{checkId:options.checkId,followupType:'supplement',updates:[{messageId:m.id,kind:'supplement'}],goal:{text:'只分析原因',evidence:[{messageId:m.id,quote:m.text}]},requirements:[],acceptance:[],constraints:[],exclusions:[],inferences:[],implementationUnknowns:[],questions:[]}};
  },{provider:'p',model:'m'});
  assert.equal(result.status,'validated-proposal');assert.equal(l.snapshot('task').interpretationOnly,true);
}));
test('extractor records invalid output and model timeout without overwriting history',()=>fixture(async l=>{
  assert.equal((await extractIntent(l,'task',async()=>({status:'completed',value:{}}),{provider:'p',model:'m'})).status,'invalid-output');
  assert.equal((await extractIntent(l,'task',async()=>({status:'timeout'}),{provider:'p',model:'m'})).status,'timeout');
  assert.equal(l.history('task').length,2);assert.equal(l.snapshot('task').current,null);
}));
test('new user input during extraction invalidates the response',()=>fixture(async l=>{
  const result=await extractIntent(l,'task',async()=>{l.ingest('s',event(2,'换个任务'));return {status:'completed',value:{}};},{provider:'p',model:'m'});
  assert.equal(result.status,'stale');assert.equal(l.snapshot('task').status,'pending');
}));
test('oversized reviewed history is compacted to active cited evidence plus every unreviewed message',()=>fixture(async l=>{
  let snapshot=l.snapshot('task');const firstId=snapshot.messages[0].id;l.commit('task',snapshot.version,proposal(snapshot.messages[0]));
  for(let seq=2;seq<=10;seq++){
    l.ingest('s',event(seq,`无关的已审阅历史 ${'x'.repeat(7000)}`));snapshot=l.snapshot('task');l.commit('task',snapshot.version,proposal(snapshot.messages.at(-1),'inquiry',[],firstId));
  }
  l.ingest('s',event(11,'补充：报告原因'));const newestId=l.snapshot('task').messages.at(-1).id;let received;
  const result=await extractIntent(l,'task',async options=>{
    received=options.input;
    const newest=received.messages.at(-1);
    return {status:'completed',value:{checkId:options.checkId,followupType:'supplement',updates:[{messageId:newest.id,kind:'supplement'}],goal:{text:'只分析原因',evidence:[{messageId:firstId,quote:'只分析原因'}]},requirements:[],acceptance:[],constraints:[],exclusions:[],inferences:[],implementationUnknowns:[],questions:[]}};
  },{provider:'p',model:'m'});
  assert.equal(result.status,'validated-proposal');
  assert.deepEqual(received.messages.map(m=>m.id),[firstId,received.unreviewedMessageIds[0]]);
  assert.equal(received.priorInterpretation.goal.text,'只分析原因');
  assert.equal(received.reviewedMessageCountOmitted,9);
  assert.deepEqual(received.unreviewedMessageIds,[newestId]);
  assert.equal(l.snapshot('task').messages.length,11);
}));
test('overlarge unreviewed messages are rejected without calling the model',()=>fixture(async l=>{
  let snapshot=l.snapshot('task');l.commit('task',snapshot.version,proposal(snapshot.messages[0]));
  for(let seq=2;seq<=4;seq++) l.ingest('s',event(seq,'x'.repeat(50000)));let calls=0;
  const result=await extractIntent(l,'task',async()=>{calls++;throw new Error('must not call');},{provider:'p',model:'m'});
  assert.equal(result.status,'input-too-large');assert.equal(calls,0);
}));
test('pending clarification keeps the validated interpretation and its cited evidence in compact input',()=>fixture(async l=>{
  let snapshot=l.snapshot('task');const first=snapshot.messages[0];l.commit('task',snapshot.version,proposal(first));
  for(let seq=2;seq<=9;seq++){l.ingest('s',event(seq,`已审阅 ${'x'.repeat(7500)}`));snapshot=l.snapshot('task');l.commit('task',snapshot.version,proposal(snapshot.messages.at(-1),'inquiry',[],first.id));}
  l.ingest('s',event(10,'第一个'));snapshot=l.snapshot('task');const ambiguousId=snapshot.messages.at(-1).id;l.commit('task',snapshot.version,{followupType:'clarification',updates:[{messageId:ambiguousId,kind:'clarification'}],goal:null,requirements:[],acceptance:[],constraints:[],exclusions:[],inferences:[],questions:['请说明需要修改的内容。']});
  l.ingest('s',event(11,'补充信息'));const latest=l.snapshot('task').messages.at(-1);let received;
  await extractIntent(l,'task',async options=>{received=options.input;return {status:'completed',value:{checkId:options.checkId,followupType:'supplement',updates:[{messageId:latest.id,kind:'supplement'}],goal:{text:'只分析原因',evidence:[{messageId:first.id,quote:'只分析原因'}]},requirements:[],acceptance:[],constraints:[],exclusions:[],inferences:[],implementationUnknowns:[],questions:[]}};},{provider:'p',model:'m'});
  assert.equal(received.priorInterpretation.goal.text,'只分析原因');
  assert.equal(received.pendingInterpretation.goal,null);
  assert.deepEqual(received.messages.map(m=>m.id),[first.id,ambiguousId,latest.id]);
  assert.equal(received.messages.find(m=>m.id===ambiguousId).text,'第一个');
  assert.deepEqual(received.pendingQuestions,['请说明需要修改的内容。']);
}));
test('compact extraction retains the original user evidence cited only by implementation unknowns',()=>fixture(async l=>{
  let snapshot=l.snapshot('task');const goal=snapshot.messages[0];l.ingest('s',event(2,'没有提供文件位置'));
  snapshot=l.snapshot('task');const unknown=snapshot.messages.at(-1);l.commit('task',snapshot.version,{followupType:'supplement',updates:[{messageId:goal.id,kind:'supplement'},{messageId:unknown.id,kind:'supplement'}],goal:{text:'只分析原因',evidence:[{messageId:goal.id,quote:'只分析原因'}]},requirements:[],acceptance:[],constraints:[],exclusions:[],inferences:[],implementationUnknowns:[{text:'未提供文件位置',evidence:[{messageId:unknown.id,quote:'没有提供文件位置'}]}],questions:[]});
  for(let seq=3;seq<=11;seq++){l.ingest('s',event(seq,`已审阅 ${'x'.repeat(7000)}`));snapshot=l.snapshot('task');l.commit('task',snapshot.version,proposal(snapshot.messages.at(-1),'inquiry',[],goal.id));}
  l.ingest('s',event(12,'继续'));const latest=l.snapshot('task').messages.at(-1);let received;
  await extractIntent(l,'task',async options=>{received=options.input;return {status:'completed',value:{checkId:options.checkId,followupType:'supplement',updates:[{messageId:latest.id,kind:'supplement'}],goal:{text:'只分析原因',evidence:[{messageId:goal.id,quote:'只分析原因'}]},requirements:[],acceptance:[],constraints:[],exclusions:[],inferences:[],implementationUnknowns:[{text:'未提供文件位置',evidence:[{messageId:unknown.id,quote:'没有提供文件位置'}]}],questions:[]}};},{provider:'p',model:'m'});
  assert.ok(received.messages.some(message=>message.id===unknown.id));
}));
test('extractor requires cited implementation unknowns without turning them into questions',()=>fixture(async l=>{
  const missing=await extractIntent(l,'task',async options=>({status:'completed',value:{checkId:options.checkId,followupType:'supplement',updates:[{messageId:options.input.messages[0].id,kind:'supplement'}],goal:{text:'只分析原因',evidence:[{messageId:options.input.messages[0].id,quote:'只分析原因'}]},requirements:[],acceptance:[],constraints:[],exclusions:[],inferences:[],questions:[]}}),{provider:'p',model:'m'});
  assert.equal(missing.status,'invalid-output');
  const result=await extractIntent(l,'task',async options=>{const m=options.input.messages[0];return {status:'completed',value:{checkId:options.checkId,followupType:'supplement',updates:[{messageId:m.id,kind:'supplement'}],goal:{text:'只分析原因',evidence:[{messageId:m.id,quote:m.text}]},requirements:[],acceptance:[],constraints:[],exclusions:[],inferences:[],implementationUnknowns:[{text:'尚未提供代码位置',evidence:[{messageId:m.id,quote:'只分析原因'}]}],questions:[]}};},{provider:'p',model:'m'});
  assert.equal(result.status,'validated-proposal');
  assert.deepEqual(l.snapshot('task').current.implementationUnknowns,[{text:'尚未提供代码位置',evidence:[{messageId:l.snapshot('task').messages[0].id,quote:'只分析原因'}]}]);
}));
test('extraction prompt requires semantic deduplication without dropping explicit requirements',()=>{
  assert.match(EXTRACTION_INSTRUCTIONS,/deduplicate repeated policy/);
  assert.match(EXTRACTION_INSTRUCTIONS,/Never omit an explicit user requirement merely to make the output shorter/);
  assert.match(EXTRACTION_INSTRUCTIONS,/at most 8 material items/);
});
test('extraction prompt keeps diagnostic facts nonblocking when repair scope is already clear',()=>{
  assert.match(EXTRACTION_INSTRUCTIONS,/diagnostic facts/);
  assert.match(EXTRACTION_INSTRUCTIONS,/must choose between materially different goals or permissions/);
});
function stagedEmpty(options){return {status:'completed',value:{checkId:options.checkId,claims:[],revisions:[],questions:[]}};}
function stagedMerge(options,overrides={}){return {status:'completed',value:{checkId:options.checkId,updates:options.input.unreviewedMessageIds.map(messageId=>({messageId,kind:'supplement'})),goalId:options.input.candidates.find(c=>c.category==='goal')?.id??null,additions:[],changes:[],questions:[],...overrides}};}
test('staged protocol rejects missing updates and an extra top-level followup classification',()=>fixture(async l=>{
  l.ingest('s',event(2,'甲'.repeat(12001)));
  const missing=await extractIntent(l,'task',async options=>{
    if(options.input.stage==='segment')return stagedEmpty(options);
    const result=stagedMerge(options);delete result.value.updates;return result;
  },{provider:'p',model:'m'});assert.equal(missing.status,'invalid-output');
  const conflict=await extractIntent(l,'task',async options=>options.input.stage==='segment'?stagedEmpty(options):stagedMerge(options,{followupType:'inquiry'}),{provider:'p',model:'m'});assert.equal(conflict.status,'invalid-output');
}));
test('staged replacement followed by inquiry retains replacement ledger semantics',()=>fixture(async l=>{
  const first=l.snapshot('task').messages[0];l.commit('task',1,proposal(first));l.ingest('s',event(2,'改成分析日志'));l.ingest('s',event(3,`${'甲'.repeat(12001)}\n进展如何`));const snapshot=l.snapshot('task');const replacement=snapshot.messages[1];const inquiry=snapshot.messages[2];
  const result=await extractIntent(l,'task',async options=>{
    if(options.input.stage==='segment')return stagedEmpty(options);
    const span=options.input.messages.find(message=>message.id===replacement.id).spans[0];
    return stagedMerge(options,{updates:[{messageId:replacement.id,kind:'replacement'},{messageId:inquiry.id,kind:'inquiry'}],goalId:null,changes:[{candidateId:options.input.candidates[0].id,action:'revoke',evidence:[{spanId:span.id}]}],additions:[{category:'goal',text:'分析日志',evidence:[{spanId:span.id}]}]});
  },{provider:'p',model:'m'});
  assert.equal(result.status,'validated-proposal');assert.equal(l.snapshot('task').current.goal.text,'分析日志');assert.equal(l.snapshot('task').currentVersion,3);
}));
test('compaction preserves cited long history in the ledger and passes validated candidates without re-extraction',()=>fixture(async l=>{
  const first=l.snapshot('task').messages[0];l.ingest('s',event(2,'甲'.repeat(12001)));let snapshot=l.snapshot('task');const long=snapshot.messages.at(-1);
  l.commit('task',snapshot.version,{followupType:'supplement',updates:[{messageId:first.id,kind:'supplement'},{messageId:long.id,kind:'supplement'}],goal:{text:'只分析原因',evidence:[{messageId:first.id,quote:'只分析原因'}]},requirements:[{text:'保留长来源',evidence:[{messageId:long.id,quote:'甲'}]}],acceptance:[],constraints:[],exclusions:[],inferences:[],questions:[]});
  for(let seq=3;seq<=10;seq++){l.ingest('s',event(seq,`已审阅 ${'x'.repeat(7000)}`));snapshot=l.snapshot('task');l.commit('task',snapshot.version,proposal(snapshot.messages.at(-1),'inquiry',[],first.id));}
  l.ingest('s',event(11,'继续'));const latest=l.snapshot('task').messages.at(-1);let received;let calls=0;
  const result=await extractIntent(l,'task',async options=>{calls++;received=options.input;return stagedMerge(options);},{provider:'p',model:'m'});
  assert.equal(calls,1);assert.equal(received.stage,'reconcile');assert.deepEqual(received.messages.map(m=>m.id),[latest.id]);
  assert.ok(received.candidates.some(c=>c.text==='保留长来源'));assert.equal(l.snapshot('task').messages.find(m=>m.id===long.id).text,long.text);
  assert.ok(l.snapshot('task').current.requirements.some(c=>c.text==='保留长来源'));assert.equal(result.status,'validated-proposal');
}));

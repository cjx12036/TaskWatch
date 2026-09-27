import test from 'node:test';
import assert from 'node:assert/strict';
import {compactSourceQuotes,expandSourceRanges} from '../packages/execution/source-ranges.mjs';
import {assessmentInput} from '../packages/execution/assess.mjs';

const claim=(messageId,quote)=>({text:'要求保留',evidence:[{messageId,quote}]});
test('source ranges preserve Chinese, emoji, repeated wording and multi-source quotes without mutating originals',()=>{
 const quote='🫧完整保留用户中文要求和来源。'.repeat(4);
 const input={instruction:'审查',userEvidence:[{id:'u',text:'前言'+quote+'尾声'},{id:'v',text:'重复 重复'}],requirements:[{id:'goal',sinceSeq:1,...claim('u',quote)},{...claim('v','重复')}],inferences:[],implementationUnknowns:[claim('u',quote)]};
 const original=structuredClone(input),compressed=compactSourceQuotes(input),expanded=expandSourceRanges(compressed);
 assert.deepEqual(input,original);assert.deepEqual(compressed.userEvidence,input.userEvidence);
 for(const key of ['requirements','inferences','implementationUnknowns'])assert.deepEqual(expanded[key],input[key]);
 assert.deepEqual(compressed.requirements[0].evidence[0].sourceRange,[2,2+quote.length]);
 assert.equal(compressed.requirements[1].evidence[0].quote,'重复');
 assert.throws(()=>compactSourceQuotes({...input,userEvidence:[]}),/Missing exact/);
 compressed.requirements[0].evidence[0].sourceRange=[0,99999];
 assert.throws(()=>expandSourceRanges(compressed),/Invalid source range/);
});
test('large assessment input compresses repeated quote transport while retaining every requirement and full user original',()=>{
 const quote='唯一的长规格：'+'中🫧'.repeat(800),ref=claim('u',quote);
 const snapshot={taskId:'task',inputVersion:1,intentVersion:1,intentReady:true,requirements:Array.from({length:100},(_,i)=>({id:`r${i}`,sinceSeq:1,...ref})),inferences:[],implementationUnknowns:[],userEvidence:[{id:'u',seq:1,text:quote}],events:[],coverage:[],history:{partial:false}};
 const input=assessmentInput(snapshot);
 assert.equal(input.sourceProtocol,'source-ranges-v1');
 assert.equal(input.requirements.length,100);assert.equal(input.userEvidence[0].text,quote);
 assert.deepEqual(expandSourceRanges(input).requirements,snapshot.requirements);
 assert.ok(Buffer.byteLength(JSON.stringify(input))<60000);
});

test('ordinary assessment wire compacts repeated source quotes and lists citation event types and sequence',()=>{
 const quote='用户原始明确要求保持逐字保留以避免任何扩大授权。'.repeat(5);
 const snapshot={taskId:'task',inputVersion:1,intentVersion:1,intentReady:true,requirements:[{id:'goal',sinceSeq:1,...claim('u',quote)}],inferences:[],implementationUnknowns:[],userEvidence:[{id:'u',seq:1,text:quote}],events:[{id:'a',seq:2,type:'assistant/message',data:{text:'公开提议'}},{id:'c',seq:3,type:'tool/call',data:{callId:'c'}},{id:'r',seq:4,type:'tool/result',data:{callId:'c',isError:false}}],coverage:['missing-public-event'],history:{partial:true,omittedEvents:3}};
 const before=structuredClone(snapshot),input=assessmentInput(snapshot);
 assert.ok(input.requirements[0].evidence[0].sourceRange);
 assert.deepEqual(input.referenceCatalog.evidence,[{id:'a',type:'assistant/message',seq:2},{id:'c',type:'tool/call',seq:3},{id:'r',type:'tool/result',seq:4}]);
 assert.deepEqual(input.events,[...snapshot.events.slice(0,2),{id:'r',seq:4,type:'tool/result',data:{callId:'c',isError:false,contentOmitted:true}}]);assert.deepEqual(input.coverage,snapshot.coverage);assert.deepEqual(input.history,snapshot.history);
 assert.deepEqual(expandSourceRanges(input).requirements,snapshot.requirements);assert.deepEqual(snapshot,before);
});

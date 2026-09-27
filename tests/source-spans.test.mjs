import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeSourceSpans,expandSpanEvidence} from '../packages/intent/source-spans.mjs';

test('source spans preserve every original character and assign repeated text distinct IDs',()=>{
  const source=encodeSourceSpans([{id:'m1',text:'重复。重复。\n结束。'}]);
  const spans=source.messages[0].spans;
  assert.equal(spans.map(span=>span.text).join(''),'重复。重复。\n结束。');
  assert.equal(new Set(spans.map(span=>span.id)).size,spans.length);
  assert.equal(spans[0].text,spans[1].text);
});

test('source spans split an overlong sentence without changing its text',()=>{
  const text='甲'.repeat(241);
  const source=encodeSourceSpans([{id:'m1',text}]);
  assert.equal(source.messages[0].spans.map(span=>span.text).join(''),text);
  assert.ok(source.messages[0].spans.every(span=>Array.from(span.text).length<=120));
});

test('blank layout spans preserve original text but never become evidence IDs',()=>{
  const source=encodeSourceSpans([{id:'m1',text:'甲\n\n乙'}]);
  const spans=source.messages[0].spans;
  assert.equal(spans.map(span=>span.text).join(''),'甲\n\n乙');
  assert.ok(spans.filter(span=>'id'in span).every(span=>span.text.trim()));
  const blank=spans.find(span=>!span.text.trim());assert.deepEqual(blank,{text:'\n'});
  assert.throws(()=>expandSpanEvidence({goal:{text:'目标',evidence:[{spanId:'s0:1'}]}},source.spanMap),/Invalid span evidence/);
});

test('span evidence expands only exact IDs supplied for this input',()=>{
  const source=encodeSourceSpans([{id:'m1',text:'第一句。第二句。'}]);
  const [first,second]=source.messages[0].spans;
  const proposal={goal:{text:'目标',evidence:[{spanId:second.id}]},requirements:[],acceptance:[],constraints:[],exclusions:[],inferences:[],implementationUnknowns:[]};
  const expanded=expandSpanEvidence(proposal,source.spanMap);
  assert.deepEqual(expanded.goal.evidence,[{messageId:'m1',quote:second.text}]);
  assert.throws(()=>expandSpanEvidence({...proposal,goal:{...proposal.goal,evidence:[{spanId:'foreign'}]}},source.spanMap),/Invalid span evidence/);
  assert.throws(()=>expandSpanEvidence({...proposal,goal:{...proposal.goal,evidence:[{messageId:'m1',quote:first.text}]}},source.spanMap),/Invalid span evidence/);
});

test('span expansion does not materialize omitted claim lists as undefined fields',()=>{
  const source=encodeSourceSpans([{id:'m1',text:'目标。'}]);
  const partial={goal:{text:'目标',evidence:[{spanId:source.messages[0].spans[0].id}]}};
  const expanded=expandSpanEvidence(partial,source.spanMap);
  assert.equal(Object.hasOwn(expanded,'requirements'),false);
  assert.equal(Object.hasOwn(expanded,'implementationUnknowns'),false);
});

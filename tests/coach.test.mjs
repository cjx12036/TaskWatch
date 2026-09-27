import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Ledger} from '../packages/intent/ledger.mjs';
import {CoachSuggestions} from '../packages/coach/suggestions.mjs';

async function fixture(fn){const dir=mkdtempSync(join(tmpdir(),'coach-')),ledger=new Ledger(join(dir,'db'));ledger.bind('t','s');ledger.ingest('s',{type:'user/message',seq:1,time:1000,data:{id:'u',source:{kind:'user'},content:[{type:'text',text:'不要增加使用步骤'}]}});const agent={id:'s',status:'running',messages:[],steer(message){this.messages.push(message);}};let revision='r1',paused=false;const coach=new CoachSuggestions(ledger,{workspaceForTask:()=>dir,agentForTask:()=>agent,currentRevision:()=>revision,authorized:()=>!paused,now:()=>100000});try{await fn({dir,ledger,coach,agent,setRevision:value=>revision=value,setPaused:value=>paused=value});}finally{ledger.close();rmSync(dir,{recursive:true,force:true});}}
const finding={category:'deviation',observation:'工具执行与要求冲突',interpretation:'增加步骤',suggestion:'核对要求',requirementIds:['goal'],evidenceIds:['call-1']};
const report={id:'report-1',revision:'r1',created:new Date(100000).toISOString(),report:{status:'assessed',result:{findings:[finding,{...finding,category:'tradeoff',tradeoff:{basis:'proposal',impact:'用户多一步操作',question:'是否接受？'},evidenceIds:['assistant-1']}],notification:{shouldNotify:true,findingIndexes:[0,1]},validation:{complete:true,rejected:[]}}}};
const evidence={formalRequirements:[{id:'goal',text:'不要增加使用步骤'}],events:[{id:'call-1',type:'tool/call',data:{name:'edit_file',arguments:'{}'}},{id:'assistant-1',type:'assistant/message',data:{text:'先手动开启'}}]};

test('coach defaults off; only consented project may auto steer verified deviation while running',()=>fixture(async ({dir,coach,agent})=>{
  assert.equal(coach.collect('t',report,evidence).length,0);
  coach.setProject(dir,true);coach.consent('t',dir);
  const suggestions=coach.collect('t',report,evidence);assert.equal(suggestions.length,2);
  assert.equal(suggestions[0].risk,'auto');assert.equal(suggestions[1].risk,'approval');
  assert.equal(coach.send('t',suggestions[0].id).status,'submitted');
  assert.equal(agent.messages.length,1);assert.equal(agent.messages[0].source.plugin,'taskwatch');
  assert.match(agent.messages[0].content[0].text,/非用户指令/);
  assert.equal(coach.send('t',suggestions[1].id).status,'approval-required');
}));
test('idle agent, changed revision and pause block steer without waking or retrying',()=>fixture(async ({dir,coach,agent,setRevision,setPaused})=>{
  coach.setProject(dir,true);coach.consent('t',dir);const [suggestion]=coach.collect('t',report,evidence);
  agent.status='idle';assert.equal(coach.send('t',suggestion.id).status,'skipped-idle');assert.equal(agent.messages.length,0);
  agent.status='running';setRevision('r2');assert.equal(coach.send('t',suggestion.id).status,'stale');
  setRevision('r1');setPaused(true);assert.equal(coach.send('t',suggestion.id).status,'unauthorized');
}));
test('coach consent expires when project is switched off and on; delivery is recorded once',()=>fixture(async ({dir,coach,agent})=>{
  coach.setProject(dir,true);coach.consent('t',dir);const [suggestion]=coach.collect('t',report,evidence);
  coach.setProject(dir,false);coach.setProject(dir,true);assert.equal(coach.consented('t'),false);
  assert.equal(coach.send('t',suggestion.id).status,'unauthorized');coach.consent('t',dir);
  const sent=coach.send('t',suggestion.id);assert.equal(sent.status,'submitted');assert.equal(coach.send('t',suggestion.id).status,'submitted');assert.equal(agent.messages.length,1);
  assert.equal(coach.observe('t',{type:'user/message',data:{id:sent.messageId,source:{kind:'plugin',plugin:'taskwatch'}}}),true);
  assert.equal(coach.get('t',suggestion.id).status,'observed');
}));
test('partial and incomplete reports cannot produce coach suggestions',()=>fixture(async ({dir,coach})=>{
  coach.setProject(dir,true);coach.consent('t',dir);
  assert.deepEqual(coach.collect('t',{...report,report:{...report.report,status:'assessed-partial'}},evidence),[]);
  assert.deepEqual(coach.collect('t',{...report,report:{...report.report,result:{...report.report.result,validation:{complete:false,rejected:[{kind:'finding',index:1}]}}}},evidence),[]);
}));
test('new evidence for the same formal requirement does not create a second automatic steer',()=>fixture(async ({dir,coach,agent})=>{
  coach.setProject(dir,true);coach.consent('t',dir);
  const [first]=coach.collect('t',report,evidence);
  assert.equal(coach.send('t',first.id).status,'submitted');
  const secondReport={...report,id:'report-2',report:{...report.report,result:{...report.report.result,findings:[{...finding,evidenceIds:['call-2']}],notification:{shouldNotify:true,findingIndexes:[0]}}}};
  const secondEvidence={...evidence,events:[...evidence.events,{id:'call-2',type:'tool/call',data:{name:'another_tool'}}]};
  assert.deepEqual(coach.collect('t',secondReport,secondEvidence),[]);
  assert.equal(agent.messages.length,1);
}));

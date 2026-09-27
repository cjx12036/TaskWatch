import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Ledger} from '../packages/intent/ledger.mjs';
import {CheckpointScheduler} from '../packages/observe/checkpoint-scheduler.mjs';

function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'tw-checkpoints-')),ledger=new Ledger(join(dir,'db.sqlite'));ledger.bind('one','session-one');ledger.bind('two','session-two');
 ledger.db.exec('CREATE TABLE execution_events(id TEXT PRIMARY KEY,task TEXT NOT NULL,seq INTEGER NOT NULL,type TEXT NOT NULL,body TEXT NOT NULL,gap TEXT)');
 let time=0,id=0;const timers=new Map(),calls=[];let active=true;
 const opts={ledger,now:()=>time,setTimeout:(fn,delay)=>{const key=++id;timers.set(key,{at:time+delay,fn});return key;},clearTimeout:key=>timers.delete(key),isActive:()=>active,notify:(task,reason)=>calls.push({task,reason,time})};
 const step=async(ms)=>{const end=time+ms;while(true){const due=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;time=due[1].at;timers.delete(due[0]);due[1].fn();await Promise.resolve();}time=end;};
 const put=(task,seq,type,body={})=>{ledger.db.prepare('INSERT INTO execution_events VALUES (?,?,?,?,?,NULL)').run(`${task}-${seq}`,task,seq,type,JSON.stringify(body));};
 return {ledger,opts,calls,step,put,close(){ledger.close();rmSync(dir,{recursive:true,force:true});},setActive(v){active=v;},get time(){return time;}};
}
test('assistant checkpoint settles two seconds, merges turn end and respects 30-second spacing',async()=>{const f=fixture();try{
 const s=new CheckpointScheduler(f.opts);f.put('one',1,'assistant/message',{text:'plan'});s.event('one',1,'assistant/message');f.put('one',2,'turn/end',{});s.event('one',2,'turn/end');await f.step(1999);assert.equal(f.calls.length,0);await f.step(1);assert.deepEqual(f.calls.map(c=>c.reason),['assistant']);s.complete('one');
 f.put('one',3,'assistant/message',{text:'update'});s.event('one',3,'assistant/message');await f.step(29999);assert.equal(f.calls.length,1);await f.step(1);assert.deepEqual(f.calls.map(c=>c.time),[2000,32000]);s.dispose();
}finally{f.close();}});
test('long tool chain needs twelve results and three minutes, isolated by task',async()=>{const f=fixture();try{
 const s=new CheckpointScheduler(f.opts);for(let i=1;i<=11;i++){f.put('one',i,'tool/result',{callId:String(i),isError:false});s.event('one',i,'tool/result');}await f.step(200000);assert.equal(f.calls.length,0);
 f.put('one',12,'tool/result',{callId:'12',isError:false});s.event('one',12,'tool/result');await f.step(0);assert.deepEqual(f.calls.map(c=>[c.task,c.reason]),[['one','tool-batch']]);
 f.put('two',1,'assistant/message',{text:'separate'});s.event('two',1,'assistant/message');await f.step(2000);assert.equal(f.calls.at(-1).task,'two');s.dispose();
}finally{f.close();}});
test('two identical failed calls expedite but one or different calls do not',async()=>{const f=fixture();try{
 const s=new CheckpointScheduler(f.opts);f.put('one',1,'tool/call',{callId:'a',name:'bash',arguments:'x'});s.event('one',1,'tool/call');f.put('one',2,'tool/result',{callId:'a',isError:true});s.event('one',2,'tool/result');await f.step(30000);assert.equal(f.calls.length,0);
 f.put('one',3,'tool/call',{callId:'b',name:'bash',arguments:'x'});s.event('one',3,'tool/call');f.put('one',4,'tool/result',{callId:'b',isError:true});s.event('one',4,'tool/result');await f.step(2000);assert.deepEqual(f.calls.map(c=>c.reason),['repeated-failure']);s.dispose();
}finally{f.close();}});
test('attempt cursor survives restart and failed same evidence never loops',async()=>{const f=fixture();try{
 let s=new CheckpointScheduler(f.opts);f.put('one',1,'assistant/message',{text:'one'});s.event('one',1,'assistant/message');await f.step(2000);s.complete('one',{status:'failed'});assert.equal(f.calls.length,1);s.dispose();s=new CheckpointScheduler(f.opts);s.restore('one');await f.step(180000);assert.equal(f.calls.length,1);f.put('one',2,'assistant/message',{text:'new'});s.event('one',2,'assistant/message');await f.step(2000);assert.equal(f.calls.length,2);s.dispose();
}finally{f.close();}});
test('side correction waits for next public checkpoint and pause suppresses timers',async()=>{const f=fixture();try{
 const s=new CheckpointScheduler(f.opts);s.sideUpdated('one');assert.equal(s.status('one').waitingForCheckpoint,true);await f.step(180000);assert.equal(f.calls.length,0);
 f.put('one',1,'assistant/message',{text:'new'});s.event('one',1,'assistant/message');assert.equal(s.status('one').pendingReason,'assistant');f.setActive(false);await f.step(2000);assert.equal(f.calls.length,0);f.setActive(true);s.restore('one');await f.step(2000);assert.equal(f.calls.length,1);s.dispose();
}finally{f.close();}});
test('new evidence during an in-flight check queues one latest snapshot and not the old one again',async()=>{const f=fixture();try{
 const s=new CheckpointScheduler(f.opts);f.put('one',1,'assistant/message',{text:'first'});s.event('one',1,'assistant/message');await f.step(2000);s.begin('one');
 f.put('one',2,'assistant/message',{text:'second'});s.event('one',2,'assistant/message');f.put('one',3,'turn/end',{});s.event('one',3,'turn/end');assert.equal(s.status('one').pendingReason,'assistant');
 await f.step(30000);assert.equal(f.calls.length,1);s.complete('one');await f.step(0);assert.equal(f.calls.length,2);s.complete('one');await f.step(100000);assert.equal(f.calls.length,2);s.dispose();
}finally{f.close();}});
test('persisted pending checkpoint resumes after pause without a periodic idle request',async()=>{const f=fixture();try{
 let s=new CheckpointScheduler(f.opts);f.put('one',1,'assistant/message',{text:'pending'});s.event('one',1,'assistant/message');s.pause('one');s.dispose();s=new CheckpointScheduler(f.opts);f.setActive(false);s.restore('one');await f.step(30000);assert.equal(f.calls.length,0);f.setActive(true);s.restore('one');await f.step(0);assert.equal(f.calls.length,1);s.complete('one');await f.step(300000);assert.equal(f.calls.length,1);s.dispose();
}finally{f.close();}});
test('stale tool-only update schedules one refresh; timeout with unchanged evidence does not',async()=>{const f=fixture();try{
 const s=new CheckpointScheduler(f.opts);f.put('one',1,'assistant/message',{text:'first'});s.event('one',1,'assistant/message');await f.step(2000);s.begin('one');f.put('one',2,'tool/result',{callId:'a',isError:false});s.event('one',2,'tool/result');s.complete('one',{status:'stale'});assert.equal(s.status('one').pendingReason,'stale-refresh');await f.step(30000);assert.equal(f.calls.length,2);s.begin('one');s.complete('one',{status:'timeout'});await f.step(300000);assert.equal(f.calls.length,2);s.dispose();
}finally{f.close();}});
test('a successful result or changed arguments break the repeated-failure streak',async()=>{const f=fixture();try{
 const s=new CheckpointScheduler(f.opts);
 const pair=(callSeq,id,args,error)=>{f.put('one',callSeq,'tool/call',{callId:id,name:'bash',arguments:args});s.event('one',callSeq,'tool/call');f.put('one',callSeq+1,'tool/result',{callId:id,isError:error});s.event('one',callSeq+1,'tool/result');};
 pair(1,'a','x',true);pair(3,'b','y',true);pair(5,'c','x',false);pair(7,'d','x',true);await f.step(30000);assert.equal(f.calls.length,0);s.dispose();
}finally{f.close();}});
test('a tool call arriving during review invalidates the old report and queues one replacement',async()=>{const f=fixture();try{
 const s=new CheckpointScheduler(f.opts);f.put('one',1,'assistant/message',{text:'first'});s.event('one',1,'assistant/message');await f.step(2000);s.begin('one');f.put('one',2,'tool/call',{callId:'a',name:'bash',arguments:'x'});s.event('one',2,'tool/call');s.complete('one',{status:'stale'});assert.equal(s.status('one').pendingReason,'stale-refresh');await f.step(30000);assert.equal(f.calls.length,2);s.dispose();
}finally{f.close();}});
test('intent-only checkpoint keeps a side correction waiting until execution review',async()=>{const f=fixture();try{
 const s=new CheckpointScheduler(f.opts);s.sideUpdated('one');f.ledger.db.prepare('INSERT INTO messages(id,task,version,seq,message_id,text,complete) VALUES (?,?,?,?,?,?,?)').run('u1','one',1,1,'msg','new request',1);s.event('one',1,'user/message');await f.step(750);assert.equal(f.calls[0].reason,'user');assert.equal(s.status('one').waitingForCheckpoint,true);s.complete('one');f.put('one',2,'assistant/message',{text:'reply'});s.event('one',2,'assistant/message');await f.step(30000);assert.equal(f.calls[1].reason,'assistant');assert.equal(s.status('one').waitingForCheckpoint,false);s.dispose();
}finally{f.close();}});
test('turn end after an assessed assistant does not repeat the same evidence',async()=>{const f=fixture();try{
 const s=new CheckpointScheduler(f.opts);f.put('one',1,'assistant/message',{text:'done'});s.event('one',1,'assistant/message');await f.step(2000);s.begin('one');s.complete('one');f.put('one',2,'turn/end',{});s.event('one',2,'turn/end');await f.step(60000);assert.equal(f.calls.length,1);s.dispose();
}finally{f.close();}});
test('turn end completes a short tool-only burst once',async()=>{const f=fixture();try{
 const s=new CheckpointScheduler(f.opts);f.put('one',1,'tool/result',{callId:'x',isError:false});s.event('one',1,'tool/result');f.put('one',2,'turn/end',{});s.event('one',2,'turn/end');await f.step(2000);assert.deepEqual(f.calls.map(c=>c.reason),['turn-end']);s.complete('one');await f.step(180000);assert.equal(f.calls.length,1);s.dispose();
}finally{f.close();}});

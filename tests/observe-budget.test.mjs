import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Ledger} from '../packages/intent/ledger.mjs';
import {BudgetStore} from '../packages/observe/budget.mjs';

const approved = {provider:'deepseek-official',model:'DeepSeek-V4-Flash',maxRequests:3,maxOutputTokens:12,maxTokens:8,timeoutMs:60000,debounceMs:250,ttlMs:60000,enabled:true};

test('shared approved budget reserves atomically and survives reopening', () => {
  const dir=mkdtempSync(join(tmpdir(),'taskwatch-budget-')); let ledger;
  try {
    ledger=new Ledger(join(dir,'ledger.sqlite')); ledger.bind('task-a','session-a'); ledger.bind('task-b','session-b');
    const budget=new BudgetStore(ledger);
    assert.equal(budget.info().configured,false);
    assert.deepEqual(budget.approve(approved).config,approved);
    assert.equal(budget.reserve(7),true);
    assert.equal(budget.reserve(6),false);
    assert.equal(budget.reserve(5),true);
    assert.equal(budget.info().requestsUsed,2);
    assert.equal(budget.info().outputTokensUsed,12);
    assert.equal(budget.reserve(1),false);
    assert.throws(()=>budget.approve({...approved,maxRequests:1}),/below used/);
    assert.throws(()=>budget.approve({...approved,maxOutputTokens:11}),/below used/);
    budget.setPaused('task-a',true); assert.equal(budget.isPaused('task-a'),true); assert.equal(budget.isPaused('task-b'),false);
    ledger.close(); ledger=new Ledger(join(dir,'ledger.sqlite'));
    const reopened=new BudgetStore(ledger);
    assert.deepEqual(reopened.info(),{configured:true,config:approved,requestsUsed:2,outputTokensUsed:12,requestsRemaining:1,outputTokensRemaining:0});
    assert.equal(reopened.isPaused('task-a'),true);
  } finally { ledger?.close(); rmSync(dir,{recursive:true,force:true}); }
});

test('disabled approval and invalid model limits cannot reserve budget', () => {
  const dir=mkdtempSync(join(tmpdir(),'taskwatch-budget-')); let ledger;
  try {
    ledger=new Ledger(join(dir,'ledger.sqlite')); const budget=new BudgetStore(ledger);
    budget.approve({...approved,enabled:false});
    assert.equal(budget.reserve(1),false);
    assert.throws(()=>budget.approve({...approved,maxTokens:8193}),/maxTokens/);
    assert.deepEqual(budget.approve({...approved,timeoutMs:180000}).config.timeoutMs,180000);
    assert.throws(()=>budget.approve({...approved,timeoutMs:180001}),/timeoutMs/);
    assert.throws(()=>budget.approve({...approved,provider:''}),/provider/);
  } finally { ledger?.close(); rmSync(dir,{recursive:true,force:true}); }
});

test('continuous project observation has no cumulative exhaustion and persists usage',()=>{
 const dir=mkdtempSync(join(tmpdir(),'taskwatch-continuous-'));let ledger;
 try{
  ledger=new Ledger(join(dir,'ledger.sqlite'));let budget=new BudgetStore(ledger);
  budget.approve({...approved,maxRequests:null,maxOutputTokens:null});
  for(let i=0;i<25;i++)assert.equal(budget.reserve(8),true);
  assert.equal(budget.info().requestsRemaining,null);assert.equal(budget.info().outputTokensRemaining,null);
  ledger.close();ledger=new Ledger(join(dir,'ledger.sqlite'));budget=new BudgetStore(ledger);
  assert.equal(budget.info().requestsUsed,25);assert.equal(budget.reserve(8),true);
  budget.approve({...approved,maxRequests:null,maxOutputTokens:null,enabled:false});assert.equal(budget.reserve(8),false);
 }finally{ledger?.close();rmSync(dir,{recursive:true,force:true});}
});

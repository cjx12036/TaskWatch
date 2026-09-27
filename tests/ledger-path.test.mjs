import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, rmSync, existsSync, realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLedgerPath, apply } from '../plugins/taskwatch/index.mjs';
const packageRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');

test('automatic ledger rejects relative homes before any creation or host access',()=>{
 const previous=process.env.DSH_HOME;
 try{
  for(const home of ['.','relative-home','../outside','~other/home']){
   assert.throws(()=>resolveLedgerPath({}, {DSH_HOME:home}),/TaskWatch.*absolute.*DSH_HOME/);
  }
  process.env.DSH_HOME='.';
  assert.throws(()=>apply(new Proxy({}, {get(){throw new Error('host accessed');}})),/TaskWatch.*DSH_HOME/);
 }finally{if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;}
});

test('automatic ledger excludes cwd, configured workspace and plugin package including symlink destinations',()=>{
 const dir=mkdtempSync(join(tmpdir(),'taskwatch-path-')),cwd=process.cwd();
 try{
  const workspace=join(dir,'project'),external=join(dir,'external');
  mkdirSync(workspace);mkdirSync(external);process.chdir(workspace);
  for(const home of [workspace,join(workspace,'nested'),packageRoot,join(packageRoot,'nested')]){
   assert.throws(()=>resolveLedgerPath({}, {DSH_HOME:home}),/TaskWatch.*outside/);
  }
  process.chdir(external);
  assert.throws(()=>resolveLedgerPath({workspacePath:workspace},{DSH_HOME:join(workspace,'missing','home')}),/TaskWatch.*outside/);
  symlinkSync(workspace,join(dir,'alias'));
  assert.throws(()=>resolveLedgerPath({workspacePath:workspace},{DSH_HOME:join(dir,'alias','missing')}),/TaskWatch.*outside/);
  assert.throws(()=>resolveLedgerPath({workspacePath:join(dir,'alias')},{DSH_HOME:join(workspace,'missing')}),/TaskWatch.*outside/);
  symlinkSync(workspace,join(external,'taskwatch'));
  assert.throws(()=>resolveLedgerPath({workspacePath:workspace},{DSH_HOME:external}),/TaskWatch.*outside/);
  assert.equal(existsSync(join(workspace,'ledger.sqlite')),false);
  assert.equal(existsSync(join(workspace,'missing')),false);
 }finally{process.chdir(cwd);rmSync(dir,{recursive:true,force:true});}
});

test('external home and explicit override stay usable; default home works when launched from home',()=>{
 const dir=mkdtempSync(join(tmpdir(),'taskwatch-path-')),cwd=process.cwd();
 try{
  const external=join(dir,'external');
  assert.equal(resolveLedgerPath({}, {DSH_HOME:external}),join(external,'taskwatch','ledger.sqlite'));
  mkdirSync(external);symlinkSync(external,join(dir,'alias'));
  assert.equal(realpathSync(dirname(dirname(resolveLedgerPath({}, {DSH_HOME:join(dir,'alias')})))),realpathSync(external));
  for(const dbPath of ['legacy/ledger.sqlite',join(packageRoot,'ledger.sqlite'),':memory:']){
   assert.equal(resolveLedgerPath({dbPath},{DSH_HOME:'.'}),dbPath);
  }
  process.chdir(homedir());
  for(const home of [undefined,'   ','~/.dsh',join(homedir(),'.dsh')]){
   assert.equal(resolveLedgerPath({}, {DSH_HOME:home}),join(homedir(),'.dsh','taskwatch','ledger.sqlite'));
  }
  assert.throws(()=>resolveLedgerPath({}, {DSH_HOME:homedir()}),/TaskWatch.*outside/);
  assert.throws(()=>resolveLedgerPath({workspacePath:homedir()},{}),/TaskWatch.*outside/);
 }finally{process.chdir(cwd);rmSync(dir,{recursive:true,force:true});}
});

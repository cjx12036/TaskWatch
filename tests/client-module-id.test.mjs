import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,cpSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
const root=new URL('..',import.meta.url);
function registration(code){let registration;runInNewContext(code,{window:{__ModuleLoader__:{load:value=>registration=value}}});return registration.id;}
test('checked-in loader registers the active package name',()=>{
 assert.equal(registration(readFileSync(new URL('plugins/taskwatch/client.js',root),'utf8')),JSON.parse(readFileSync(new URL('package.json',root),'utf8')).name);
});
test('public client build registers the public package name',()=>{
 const dir=mkdtempSync(join(tmpdir(),'taskwatch-client-id-'));
 try{mkdirSync(join(dir,'plugins/taskwatch'),{recursive:true});for(const file of ['client.source.mjs','i18n.mjs'])cpSync(new URL('plugins/taskwatch/'+file,root),join(dir,'plugins/taskwatch',file));writeFileSync(join(dir,'package.json'),JSON.stringify({name:'dsh-taskwatch'}));
 execFileSync(process.execPath,[new URL('scripts/build-taskwatch-client.mjs',root).pathname],{cwd:dir});
 assert.equal(registration(readFileSync(join(dir,'plugins/taskwatch/client.js'),'utf8')),'dsh-taskwatch');
 }finally{rmSync(dir,{recursive:true,force:true});}
});


test('sidebar waits for the layout service before registering its overlay',async()=>{
 const {Context}=await import('@deepseek-ai/cordis');
 let registration;runInNewContext(readFileSync(new URL('plugins/taskwatch/client.js',root),'utf8'),{window:{__ModuleLoader__:{load:value=>registration=value}}});
 const plugin=registration.factory(()=>({}));const ctx=new Context();let registrations=0,declared=false;
 try{
  ctx.reflect.provide('slots',{register:spec=>{assert.equal(declared,true,'overlay parent has not declared its slots');assert.equal(spec.name,'shell.overlay');registrations++;return()=>{registrations--;};}});
  ctx.reflect.provide('connection',{rpc:{}});ctx.reflect.provide('locale',{});
  await ctx.plugin(plugin);
  assert.equal(registrations,0);
  const layout=await ctx.plugin({apply(scope){scope.effect(()=>{const off=scope.reflect.provide('layout',{});declared=true;return()=>{declared=false;off();};});}});
  assert.equal(registrations,1);
  await layout.dispose();assert.equal(registrations,0);
 }finally{await ctx.fiber.dispose();}
});

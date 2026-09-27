import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, readdir, symlink, rm, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportPublic, scanPublicTree} from '../scripts/export-public.mjs';

async function fixture(t, files={'plugin.mjs':'export const safe = true;\n'}) {
 const dir=await realpath(await mkdtemp(join(tmpdir(),'taskwatch-export-test-')));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const root=join(dir,'source'),output=join(dir,'output');
 await mkdir(join(root,'release'),{recursive:true});
 await writeFile(join(root,'release/files.json'),JSON.stringify({version:1,files:Object.keys(files).map(path=>({source:path,path}))}));
 for(const [path,body] of Object.entries(files)){await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),body);}
 return {root,output,dir};
}
test('deterministic export includes hashes and rejects unexpected output files',async t=>{
 const f=await fixture(t);const a=await exportPublic(f),b=await exportPublic({...f,output:join(f.dir,'second')});
 assert.deepEqual(a,b);assert.match(await readFile(join(f.output,'SHA256SUMS'),'utf8'),/^[a-f0-9]{64}  plugin.mjs/m);
 await writeFile(join(f.output,'extra.txt'),'unexpected');await assert.rejects(scanPublicTree({root:f.output,files:a.files}),/unexpected file/);
});
test('refuses an output containing old Git history',async t=>{
 const f=await fixture(t);await mkdir(join(f.output,'.git'),{recursive:true});await writeFile(join(f.output,'.git/HEAD'),'old history');
 await assert.rejects(exportPublic(f),/empty/);assert.equal(await readFile(join(f.output,'.git/HEAD'),'utf8'),'old history');
});
for(const path of ['docs/cases/example.json','.dsh/config.json','.git/config','artifacts/report.txt','../escape','config.local.json','.npmrc','.ssh/id_rsa','.aws/config'])test(`rejects forbidden allowlist path ${path}`,async t=>{
 const f=await fixture(t);await writeFile(join(f.root,'release/files.json'),JSON.stringify({version:1,files:[{source:'plugin.mjs',path}]}));await assert.rejects(exportPublic(f),/forbidden path/);
});
for(const [kind,body] of [['machine path','/Us'+'ers/synthetic/private'],['windows path','C:\\Us'+'ers\\synthetic\\private'],['credential','sk-'+'a'.repeat(30)],['private key','-----BEGIN '+'PRIVATE KEY-----'],['assigned secret','api_key = "'+'synthetic-secret-value'+'"']])test(`rejects ${kind} without echoing content`,async t=>{
 const f=await fixture(t,{'plugin.mjs':body});await assert.rejects(exportPublic(f),error=>/forbidden content/.test(error.message)&&!error.message.includes(body));
});
test('rejects symlink files and ancestor directories',async t=>{
 const f=await fixture(t);await rm(join(f.root,'plugin.mjs'));await symlink(join(f.root,'release/files.json'),join(f.root,'plugin.mjs'));await assert.rejects(exportPublic(f),/symlink/);
});
test('private source files outside allowlist are never copied',async t=>{
 const f=await fixture(t);await mkdir(join(f.root,'docs/cases'),{recursive:true});await writeFile(join(f.root,'docs/cases/private.json'),'synthetic private input');
 const result=await exportPublic(f);assert.ok(!result.files.some(path=>path.includes('cases')));assert.deepEqual((await readdir(f.output)).sort(),['SHA256SUMS','plugin.mjs','public-export.json']);
});
test('rejects a symlink directory in a selected source path',async t=>{
 const f=await fixture(t);await mkdir(join(f.root,'real'));await writeFile(join(f.root,'real/plugin.mjs'),'export {};');await symlink(join(f.root,'real'),join(f.root,'linked'));
 await writeFile(join(f.root,'release/files.json'),JSON.stringify({version:1,files:[{source:'linked/plugin.mjs',path:'plugin.mjs'}]}));await assert.rejects(exportPublic(f),/symlink/);
});
test('rejects a symlink output without modifying its target',async t=>{
 const f=await fixture(t);await mkdir(join(f.dir,'target'));await symlink(join(f.dir,'target'),f.output);await assert.rejects(exportPublic(f),/symlink/);assert.deepEqual(await readdir(join(f.dir,'target')),[]);
});
test('rejects local lockfile dependencies',async t=>{
 const f=await fixture(t,{'package-lock.json':JSON.stringify({packages:{'node_modules/example':{resolved:'file:../private'}}})});await assert.rejects(exportPublic(f),/non-registry/);
});
test('rejects duplicate destinations before copying any file',async t=>{
 const f=await fixture(t);await writeFile(join(f.root,'release/files.json'),JSON.stringify({version:1,files:[{source:'plugin.mjs',path:'plugin.mjs'},{source:'plugin.mjs',path:'plugin.mjs'}]}));await assert.rejects(exportPublic(f),/duplicate/);
});

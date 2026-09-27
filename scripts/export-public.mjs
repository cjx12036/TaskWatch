import {lstat,readFile,writeFile,readdir,mkdir,realpath} from 'node:fs/promises';
import {resolve,dirname,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';

const metadata=['SHA256SUMS','public-export.json'];
function safePath(path){
 if(typeof path!=='string'||!path||path.startsWith('/')||path.includes('\\')||path.split('/').some(part=>!part||part==='.'||part==='..')||/^[a-z]:/i.test(path)||/(^|\/)(?:\.git|\.npmrc|\.ssh|\.aws|\.dsh|\.codex|\.superpowers|node_modules|artifacts|cases|probes|credentials|secrets)(\/|$)|(^|\/)\.env(?:\.|$)|(?:^|\/)(?:config\.local\.|.*\.sqlite)|^apps\//i.test(path))throw new Error('forbidden path in public file manifest');
}
async function regular(root,path){
 let current=root;
 for(const part of path.split('/')){current=join(current,part);const stat=await lstat(current);if(stat.isSymbolicLink())throw new Error(`symlink forbidden: ${path}`);}
 const stat=await lstat(current);if(!stat.isFile())throw new Error(`not a regular file: ${path}`);
 return current;
}
function scanContent(path,bytes){
 const text=bytes.toString('utf8');
 const rules=[/\/(?:Users|home)\/[A-Za-z0-9_.-]+\//,/\/(?:private\/)?(?:var\/folders|tmp)\/[A-Za-z0-9_.-]+\//,/[A-Za-z]:\\(?:Users|Documents and Settings)\\/i,/(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/(?:api[_-]?key|access[_-]?token|password|secret)\s*["']?\s*[:=]\s*["'][^"'\n]{12,}["']/i];
 if(bytes.includes(0)||rules.some(rule=>rule.test(text)))throw new Error(`forbidden content: ${path}`);
 if(path.endsWith('package-lock.json')){
  const lock=JSON.parse(text);
  for(const pkg of Object.values(lock.packages??{}))if(pkg.link||pkg.resolved&& !/^https:\/\/registry\.npmjs\.org\//.test(pkg.resolved))throw new Error(`non-registry lockfile dependency: ${path}`);
 }
}
async function walk(root,prefix=''){
 const result=[];
 for(const entry of await readdir(join(root,prefix),{withFileTypes:true})){
  const path=prefix?`${prefix}/${entry.name}`:entry.name;safePath(path);
  if(entry.isSymbolicLink())throw new Error(`symlink forbidden: ${path}`);
  if(entry.isDirectory())result.push(...await walk(root,path));else if(entry.isFile())result.push(path);else throw new Error(`not a regular file: ${path}`);
 }
 return result.sort();
}
export async function scanPublicTree({root,files}){
 const actual=await walk(root),expected=[...files].sort();
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('unexpected file or missing allowlisted file');
 for(const path of actual)scanContent(path,await readFile(await regular(root,path)));
 return actual;
}
export async function exportPublic({root,output}){
 root=await realpath(root);output=resolve(output);
 if(output===root||!relative(root,output).startsWith('..'+sep)&&relative(root,output)!=='..')throw new Error('output must be outside source tree');
 // Refuse symlink destinations (including ancestors), even when they point at an empty directory.
 let ancestor=output;
 for(;;){try{if((await lstat(ancestor)).isSymbolicLink())throw new Error('symlink output forbidden');}catch(error){if(error.code!=='ENOENT')throw error;}const parent=dirname(ancestor);if(parent===ancestor)break;ancestor=parent;}
 try{if((await readdir(output)).length)throw new Error('output must be empty');}catch(error){if(error.code!=='ENOENT')throw error;}
 const manifest=JSON.parse(await readFile(await regular(root,'release/files.json'),'utf8'));
 if(manifest.version!==1||!Array.isArray(manifest.files)||!manifest.files.length)throw new Error('invalid public file manifest');
 const entries=[...manifest.files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0),seen=new Set(),contents=[];
 for(const entry of entries){
  safePath(entry.source);safePath(entry.path);
  if(seen.has(entry.path)||metadata.includes(entry.path))throw new Error('duplicate or reserved manifest path');seen.add(entry.path);
  const bytes=await readFile(await regular(root,entry.source));scanContent(entry.path,bytes);contents.push(bytes);
 }
 await mkdir(output,{recursive:true});
 for(let i=0;i<entries.length;i++){const target=join(output,entries[i].path);await mkdir(dirname(target),{recursive:true});await writeFile(target,contents[i],{flag:'wx'});}
 if(manifest.buildClient){
  // Build using the active public package name, never copy the private registration unchanged.
  execFileSync(process.execPath,[join(root,'scripts/build-taskwatch-client.mjs')],{cwd:output,stdio:'pipe'});
  const pkg=JSON.parse(await readFile(join(output,'package.json'),'utf8'));let registration;
  runInNewContext(await readFile(join(output,'plugins/taskwatch/client.js'),'utf8'),{window:{__ModuleLoader__:{load:value=>{registration=value;}}}},{timeout:1000});
  if(registration?.id!==pkg.name)throw new Error('client registration does not match public package name');
 }
 const paths=entries.map(entry=>entry.path);
 await scanPublicTree({root:output,files:paths});
 const hashes=[];for(const path of paths)hashes.push({path,sha256:createHash('sha256').update(await readFile(join(output,path))).digest('hex')});
 await writeFile(join(output,'public-export.json'),JSON.stringify({version:1,files:hashes},null,2)+'\n',{flag:'wx'});
 const auditHash=createHash('sha256').update(await readFile(join(output,'public-export.json'))).digest('hex');
 await writeFile(join(output,'SHA256SUMS'),[...hashes,{path:'public-export.json',sha256:auditHash}].sort((a,b)=>a.path<b.path?-1:1).map(item=>`${item.sha256}  ${item.path}\n`).join(''),{flag:'wx'});
 const files=[...paths,...metadata].sort();await scanPublicTree({root:output,files});
 return {files};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];if(!output)throw new Error('Usage: node scripts/export-public.mjs EMPTY_OUTPUT_DIRECTORY');
 const result=await exportPublic({root:resolve(dirname(fileURLToPath(import.meta.url)),'..'),output});
 console.log(JSON.stringify(result,null,2));
}

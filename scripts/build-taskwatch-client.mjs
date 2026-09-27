import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
const {name}=JSON.parse(await readFile('package.json','utf8'));
if(typeof name!=='string'||!name)throw new Error('package name is required');

await build({
  entryPoints: ['plugins/taskwatch/client.source.mjs'],
  bundle: true,
  define: {__TASKWATCH_MODULE_ID__: JSON.stringify(name)},
  platform: 'browser',
  format: 'iife',
  charset: 'utf8',
  outfile: 'plugins/taskwatch/client.js',
});

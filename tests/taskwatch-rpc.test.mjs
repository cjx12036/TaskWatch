import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSidebarRpc, safeRpcError} from '../plugins/taskwatch/web.mjs';

test('safeRpcError returns a stable public error without exception details', () => {
  assert.deepEqual(safeRpcError(new Error('private path /tmp/secret')), {
    ok: false,
    error: {code: 'bad-request', message: 'TaskWatch request failed'},
  });
});

test('sidebar RPC rejects an unconfirmed project enablement without calling the API', async () => {
  let handler;
  let enableProjectCalls = 0;
  const ctx = {
    connection: {rpc: {handle(channel, value) { assert.equal(channel, '/taskwatch'); handler = value; }}},
    taskwatch: {sidebar: {
      state: async () => ({ok: true}),
      enableProject: async () => { enableProjectCalls++; },
    }},
  };
  mountSidebarRpc(ctx);

  const result = await handler('enable-project', {sessionId: 'task-1'});
  assert.deepEqual(result, {
    ok: false,
    error: {code: 'bad-request', message: 'TaskWatch request failed'},
  });
  assert.equal(enableProjectCalls, 0);
});

test('new host transport uses authenticated exact routes with loopback and bounded envelope checks',async()=>{
 const routes=new Map(),injections=[];let calls=0;
 mountSidebarRpc({on:(name,fn)=>{assert.equal(name,'webserver/index-inject');fn(injections);},connection:{fetch:{register:route=>{routes.set(route.path,route);return()=>routes.delete(route.path);}}},taskwatch:{sidebar:{state:async()=>{calls++;return {configured:false};}}}});
 assert.deepEqual(injections,[{kind:'global',name:'__TASKWATCH_RPC_TRANSPORT__',value:'api'}]);
 const route=routes.get('/api/taskwatch/state');assert.ok(route);assert.equal(route.requestBody,'streaming');
 const request=(host='localhost:8080',origin='http://localhost:8080',body=JSON.stringify({type:'client-request',rpcId:'test',method:'taskwatch/state',payload:{}}))=>new Request('http://dsh.internal/api/taskwatch/state',{method:'POST',headers:{host,origin,'content-type':'application/json'},body});
 assert.deepEqual(await (await route.fetch(request())).json(),{type:'server-response',rpcId:'test',result:{ok:true,value:{configured:false}}});
 for(const [host,origin] of [['example.com','http://example.com'],['localhost:8080','http://evil.example'],['localhost:8080','http://localhost:8081'],['localhost@evil.example','http://evil.example']])assert.equal((await route.fetch(request(host,origin))).status,403);
 for(const host of ['127.0.0.2:8080','[::1]:8080'])assert.equal((await route.fetch(request(host,'http://'+host))).status,200);
 assert.equal((await route.fetch(request(undefined,undefined,'x'.repeat(65537)))).status,413);
 assert.equal((await route.fetch(request(undefined,undefined,'{}'))).status,400);
 assert.equal(calls,3);
 assert.equal(routes.has('/api/taskwatch/unknown'),false);
});

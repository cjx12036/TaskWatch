const id=value=>{if(typeof value!=='string'||!value.trim()||value.length>512)throw new Error('Invalid task');return value;};
const fields=(value,allowed,required=allowed)=>{if(required.some(key=>!(key in value))||Object.keys(value).some(key=>!allowed.includes(key)))throw new Error('Invalid payload fields');};
const pageNumber=value=>{if(!Number.isSafeInteger(value)||value<0)throw new Error('Invalid before sequence');return value;};
export function safeRpcError(error){
 return {ok:false,error:{code:'bad-request',message:'TaskWatch request failed'}};
}
export function mountSidebarRpc(ctx){
 const handler=async(endpoint,payload)=>{
  try{
   if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Invalid payload');
   const api=ctx.taskwatch.sidebar;let value;
   switch(endpoint){
    case 'state': value=await api.state(payload.sessionId===undefined?undefined:id(payload.sessionId));break;
    case 'configure': if(payload.confirmed!==true)throw new Error('Confirmation required');value=await api.configure(payload.config);break;
    case 'enable-project':
     fields(payload,['sessionId','confirmed']);if(payload.confirmed!==true)throw new Error('Confirmation required');value=await api.enableProject(id(payload.sessionId));break;
    case 'shared-extraction':
     fields(payload,['sessionId','enabled','confirmed']);if(payload.confirmed!==true||typeof payload.enabled!=='boolean')throw new Error('Confirmation required');value=await api.enableSharedExtraction(id(payload.sessionId),payload.enabled);break;
    case 'coach-project':
     fields(payload,['sessionId','enabled','confirmed']);if(payload.confirmed!==true||typeof payload.enabled!=='boolean')throw new Error('Confirmation required');value=await api.setCoachProject(id(payload.sessionId),payload.enabled);break;
    case 'consent-coach':
     fields(payload,['sessionId','confirmed']);if(payload.confirmed!==true)throw new Error('Confirmation required');value=await api.consentCoach(id(payload.sessionId));break;
    case 'send-coach':
     fields(payload,['sessionId','suggestionId','confirmed']);if(payload.confirmed!==true)throw new Error('Confirmation required');value=await api.sendCoach(id(payload.sessionId),id(payload.suggestionId));break;
    case 'dismiss-coach':
     fields(payload,['sessionId','suggestionId']);value=await api.dismissCoach(id(payload.sessionId),id(payload.suggestionId));break;
    case 'scan-shared-extraction':
     fields(payload,['sessionId']);value=await api.scanSharedExtraction(id(payload.sessionId));break;
    case 'run-shared-extraction':
     fields(payload,['sessionId','confirmed']);if(payload.confirmed!==true)throw new Error('Confirmation required');value=await api.runSharedExtraction(id(payload.sessionId));break;
    case 'confirm-shared-candidate':
     fields(payload,['sessionId','candidateId','confirmed']);if(payload.confirmed!==true)throw new Error('Confirmation required');value=await api.confirmSharedCandidate(id(payload.sessionId),id(payload.candidateId));break;
    case 'dismiss-shared-candidate':
     fields(payload,['sessionId','candidateId']);value=await api.dismissSharedCandidate(id(payload.sessionId),id(payload.candidateId));break;
    case 'disable-project':
     fields(payload,['sessionId','confirmed']);if(payload.confirmed!==true)throw new Error('Confirmation required');value=await api.disableProject(id(payload.sessionId));break;
    case 'decide':
     fields(payload,['sessionId','choice','confirmed']);if(payload.confirmed!==true||!['accept','decline'].includes(payload.choice))throw new Error('Invalid task decision');value=await api.decide(id(payload.sessionId),payload.choice);break;
    case 'enable': value=await api.enable(id(payload.sessionId));break;
    case 'pause': value=await api.pause(id(payload.sessionId));break;
    case 'resume': value=await api.resume(id(payload.sessionId));break;
    case 'chat':
     if(typeof payload.text!=='string'||!payload.text.trim()||payload.text.length>8000||!['ask','correct'].includes(payload.mode))throw new Error('Invalid chat');
     value=await api.chat(id(payload.sessionId),payload.text,payload.mode);break;
    case 'answer':
     fields(payload,['sessionId','cardId','text']);if(typeof payload.text!=='string'||!payload.text.trim()||payload.text.length>8000)throw new Error('Invalid answer');
     value=await api.answer(id(payload.sessionId),id(payload.cardId),payload.text);break;
    case 'defer':
     fields(payload,['sessionId','cardId','until']);if(typeof payload.until!=='string'||Number.isNaN(Date.parse(payload.until)))throw new Error('Invalid defer');
     value=await api.defer(id(payload.sessionId),id(payload.cardId),payload.until);break;
    case 'confirm-goal-change':
     fields(payload,['sessionId','draftId','confirmed']);if(payload.confirmed!==true)throw new Error('Confirmation required');value=await api.confirmGoalChange(id(payload.sessionId),id(payload.draftId));break;
    case 'dismiss-goal-change':
     fields(payload,['sessionId','draftId']);value=await api.dismissGoalChange(id(payload.sessionId),id(payload.draftId));break;
    case 'publish-goal-document':
     fields(payload,['sessionId','confirmed']);if(payload.confirmed!==true)throw new Error('Confirmation required');value=await api.publishGoalDocument(id(payload.sessionId));break;
    case 'evidence':
     fields(payload,['sessionId','eventId']);value=await api.evidence(id(payload.sessionId),id(payload.eventId));break;
    case 'page':
     fields(payload,['sessionId','beforeSeq','limit']);
     if(!Number.isSafeInteger(payload.limit)||payload.limit<1||payload.limit>40)throw new Error('Invalid page limit');
     value=await api.page(id(payload.sessionId),{beforeSeq:pageNumber(payload.beforeSeq),limit:payload.limit});break;
    case 'dismiss':
     if(typeof payload.cardId==='string'&&Object.keys(payload).every(key=>['sessionId','cardId'].includes(key)))value=await api.dismissCard(id(payload.sessionId),id(payload.cardId));
     else {fields(payload,['sessionId','reportId']);value=await api.dismiss(id(payload.sessionId),id(payload.reportId));}break;
    default:throw new Error('Unknown endpoint');
   }
   return {ok:true,value};
  }catch(error){return safeRpcError(error);}
 };
 // New hosts own authentication and the /api carrier; exact Fetch routes avoid
 // their legacy channel registration's provider-fiber webServer dependency.
 if(ctx.connection.fetch?.register){
  const disposers=SIDEBAR_ENDPOINTS.map(endpoint=>ctx.connection.fetch.register({path:'/api/taskwatch/'+endpoint,methods:['POST'],requestBody:'streaming',fetch:request=>fetchSidebar(request,endpoint,handler)}));
  ctx.on('webserver/index-inject',table=>table.push({kind:'global',name:'__TASKWATCH_RPC_TRANSPORT__',value:'api'}));
  return ()=>Promise.all(disposers.map(dispose=>dispose()));
 }
 ctx.on?.('webserver/index-inject',table=>table.push({kind:'global',name:'__TASKWATCH_RPC_TRANSPORT__',value:'channel'}));
 return ctx.connection.rpc.handle('/taskwatch',handler,{authority:'loopback'});
}

const SIDEBAR_ENDPOINTS=['state','configure','enable-project','shared-extraction','coach-project','consent-coach','send-coach','dismiss-coach','scan-shared-extraction','run-shared-extraction','confirm-shared-candidate','dismiss-shared-candidate','disable-project','decide','enable','pause','resume','chat','answer','defer','confirm-goal-change','dismiss-goal-change','publish-goal-document','evidence','page','dismiss'];

// The carrier already authenticated the request. Retain TaskWatch's narrower
// loopback-only boundary even if the host trusts additional remote authorities.
function loopbackRequest(request){
 const host=request.headers.get('host');
 if(!host||!/^[[\]A-Za-z0-9.:-]+$/.test(host))return false;
 try{
  const authority=new URL('http://'+host);
  const local=authority.hostname==='localhost'||authority.hostname==='[::1]'||/^127\.\d+\.\d+\.\d+$/.test(authority.hostname);
  if(!local||authority.username||authority.password||authority.pathname!=='/'||authority.search||authority.hash)return false;
  const site=request.headers.get('sec-fetch-site');if(site&&site!=='same-origin'&&site!=='none')return false;
  const origin=request.headers.get('origin');if(!origin)return true;
  const parsed=new URL(origin);return ['http:','https:'].includes(parsed.protocol)&&parsed.origin===origin&&parsed.host===new URL(parsed.protocol+'//'+host).host;
 }catch{return false;}
}
async function fetchSidebar(request,endpoint,handler){
 if(!loopbackRequest(request))return new Response('forbidden',{status:403});
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return new Response('unsupported content type',{status:415});
 // Streaming registration prevents the host from buffering an oversized body
 // before this plugin's 64 KiB limit can reject it.
 const reader=request.body?.getReader();const chunks=[];let size=0;
 if(reader)try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return new Response('request too large',{status:413});}chunks.push(value);}}catch{return new Response('invalid request',{status:400});}
 let message;try{message=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return new Response('invalid request',{status:400});}
 if(!message||message.type!=='client-request'||typeof message.rpcId!=='string'||message.rpcId.length>512||message.method!=='taskwatch/'+endpoint||!Object.hasOwn(message,'payload'))return new Response('invalid request',{status:400});
 const result=await handler(endpoint,message.payload);
 return Response.json({type:'server-response',rpcId:message.rpcId,result:result.ok?result:{...result,error:{...result.error,details:{}}}},{headers:{'cache-control':'no-store'}});
}

import { randomUUID } from 'node:crypto';
import { extractLongIntent } from './long-extract.mjs';
import { EXTRACTION_INSTRUCTIONS, validateProposal } from './schema.mjs';
import { safeCheckDiagnostics } from '../dsh-adapter/diagnostics.mjs';

const MAX_INPUT_BYTES=60000;
const SOURCE_SPAN_THRESHOLD_BYTES=12000;
const COMPACT_CONTEXT_INSTRUCTIONS=`This input compacted reviewed history because its full form exceeded the input limit. priorInterpretation is the latest validated interpretation that carries existing active requirements. pendingInterpretation and pendingQuestions remain unresolved and must not erase priorInterpretation requirements. messages contains every unreviewed user message and the exact original user messages cited by either interpretation. reviewedMessageCountOmitted is the count of reviewed messages deliberately omitted; it is not hidden evidence. Do not let an inference replace an explicit user requirement, and still return updates for every unreviewedMessageId.`;
function pendingClarificationChain(ledger,taskId,currentVersion){
  return ledger.history(taskId).filter(record=>record.status==='needs-clarification'&&record.body&&record.version>(currentVersion??0)).map(record=>record.body);
}
function citedMessageIds(proposal){
  const ids=new Set();
  if(!proposal)return ids;
  for(const claim of [proposal.goal,...['requirements','acceptance','constraints','exclusions','inferences','implementationUnknowns'].flatMap(key=>proposal[key]??[])]){
    for(const evidence of claim?.evidence??[])ids.add(evidence.messageId);
  }
  return ids;
}
function compactInput(ledger,taskId,snapshot){
  const prior=snapshot.current;
  const pendingChain=snapshot.questions.length?pendingClarificationChain(ledger,taskId,snapshot.currentVersion):[];
  const pending=pendingChain.at(-1)??null;
  const unreviewed=snapshot.messages.filter(message=>message.version>snapshot.reviewedVersion);
  const pendingSourceIds=pendingChain.flatMap(proposal=>(proposal.updates??[]).map(update=>update.messageId));
  const included=new Set([...unreviewed.map(message=>message.id),...citedMessageIds(prior),...citedMessageIds(pending),...pendingSourceIds]);
  const messages=snapshot.messages.filter(message=>included.has(message.id)).map(({id,text})=>({id,text}));
  const reviewedMessageCountOmitted=snapshot.messages.filter(message=>message.version<=snapshot.reviewedVersion&&!included.has(message.id)).length;
  return {instruction:`${EXTRACTION_INSTRUCTIONS}\n\n${COMPACT_CONTEXT_INSTRUCTIONS}`,messages,
    unreviewedMessageIds:unreviewed.map(message=>message.id),priorInterpretation:prior,pendingInterpretation:pending,pendingQuestions:snapshot.questions,reviewedMessageCountOmitted};
}
function sourceBytes(messages){return messages.reduce((total,message)=>total+Buffer.byteLength(message.text),0);}
// The caller authorizes this task's text, provider and per-call resource limits.
export async function extractIntent(ledger,taskId,check,route,isActive=()=>true,readContext=null){
  const snapshot=ledger.snapshot(taskId);
  if(snapshot.version===0)return {status:'empty'};
  if(snapshot.status==='incomplete-evidence')return {status:'incomplete-evidence'};
  if(snapshot.reviewedVersion===snapshot.version)return {status:'already-reviewed',version:snapshot.version};
  const checkId=randomUUID();
  let input={instruction:EXTRACTION_INSTRUCTIONS,messages:snapshot.messages.map(({id,text})=>({id,text})),
    unreviewedMessageIds:snapshot.messages.filter(m=>m.version>snapshot.reviewedVersion).map(m=>m.id)};
  let context;
  try {context=readContext?readContext(snapshot):{assistantMessages:[],coverage:{available:false}};}
  catch {return ledger.recordFailure(taskId,snapshot.version,'failed');}
  const attachContext=value=>({...value,assistantContext:context.assistantMessages,contextCoverage:context.coverage});
  input=attachContext(input);
  if(Buffer.byteLength(JSON.stringify({checkId,input}))>MAX_INPUT_BYTES)input=attachContext(compactInput(ledger,taskId,snapshot));
  if(sourceBytes(input.messages)>SOURCE_SPAN_THRESHOLD_BYTES)return extractLongIntent(ledger,taskId,snapshot,check,route,isActive,context,input);
  if(Buffer.byteLength(JSON.stringify({checkId,input}))>MAX_CHECK_INPUT_BYTES)return ledger.recordFailure(taskId,snapshot.version,'input-too-large');
  let result;
  try {result=await check({provider:route.provider,model:route.model,maxTokens:route.maxTokens??2048,
    timeoutMs:route.timeoutMs??180000,cleanupTimeoutMs:5000,checkId,input});}
  catch {if(!isActive())return {status:'disposed'};return ledger.recordFailure(taskId,snapshot.version,'failed');}
  if(!isActive())return {status:'disposed'};
  if(ledger.snapshot(taskId).version!==snapshot.version)return ledger.recordFailure(taskId,snapshot.version,'failed');
  if(result.status!=='completed')return ledger.recordFailure(taskId,snapshot.version,result.status==='timeout'?'timeout':'failed',null,safeCheckDiagnostics(result.diagnostics));
  try {
    if(result.value?.checkId!==checkId)throw new Error('Check correlation mismatch');
    const {checkId:_,...rawProposal}=result.value;
    const proposal=rawProposal;
    validateProposal(proposal,snapshot.messages,snapshot.reviewedVersion,{requireImplementationUnknowns:true});
    return ledger.commit(taskId,snapshot.version,proposal);
  } catch(error) {return ledger.recordFailure(taskId,snapshot.version,'invalid-output',
    ['Invalid intent schema','Invalid followup type','Missing message updates','Invalid message update','Inconsistent followup type',
      'Invalid intent text','Missing evidence','Invalid evidence reference or quote','Invalid intent list','Too many intent claims','Invalid questions','Missing goal or clarification','Invalid span evidence',
      'Check correlation mismatch'].includes(error.message)?error.message:'COMMIT_FAILED');}
}
import { MAX_CHECK_INPUT_BYTES } from '../dsh-adapter/limits.mjs';

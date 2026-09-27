const fields = ['followupType','updates','goal','requirements','acceptance','constraints','exclusions','inferences','questions'];
const implementationUnknownsField='implementationUnknowns';
const sharedScopeHintsField='sharedScopeHints';
const MAX_UNKNOWN_CLAIMS=8;
const MAX_CLAIMS_PER_LIST=256;
const MAX_TOTAL_CLAIMS=256;
const kinds=['supplement','replacement','clarification','inquiry'];
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key=>!keys.includes(key)) || keys.some(key=>!(key in value))) throw new Error('Invalid intent schema');
}
function text(value) { if(typeof value!=='string'||!value.trim()||value.length>8000)throw new Error('Invalid intent text'); }
export function validateProposal(value, messages, reviewedVersion=0,{requireImplementationUnknowns=false}={}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key=>![...fields,implementationUnknownsField,sharedScopeHintsField].includes(key))
    || fields.some(key=>!(key in value))
    || (requireImplementationUnknowns && !(implementationUnknownsField in value))) throw new Error('Invalid intent schema');
  if(!kinds.includes(value.followupType))throw new Error('Invalid followup type');
  const pending=messages.filter(m=>m.version>reviewedVersion);
  if(!Array.isArray(value.updates)||value.updates.length!==pending.length)throw new Error('Missing message updates');
  value.updates.forEach((update,i)=>{object(update,['messageId','kind']);if(update.messageId!==pending[i].id||!kinds.includes(update.kind))throw new Error('Invalid message update');});
  if(value.updates.at(-1)?.kind!==value.followupType)throw new Error('Inconsistent followup type');
  const sources=new Map(messages.filter(m=>m.complete).map(m=>[m.id,m.text]));
  const claim=entry=>{
    object(entry,['text','evidence']);text(entry.text);
    if(!Array.isArray(entry.evidence)||entry.evidence.length<1||entry.evidence.length>64)throw new Error('Missing evidence');
    for(const ref of entry.evidence){object(ref,['messageId','quote']);text(ref.quote);
      if(!sources.get(ref.messageId)?.includes(ref.quote))throw new Error('Invalid evidence reference or quote');}
  };
  if(value.goal!==null)claim(value.goal);
  let claims=value.goal?1:0;
  for(const key of ['requirements','acceptance','constraints','exclusions','inferences',implementationUnknownsField]){
    const legacyMissingUnknowns=key===implementationUnknownsField&&!Object.hasOwn(value,key)&&!requireImplementationUnknowns;
    const entries=legacyMissingUnknowns?[]:value[key];
    if(!Array.isArray(entries)||entries.length>(key===implementationUnknownsField?MAX_UNKNOWN_CLAIMS:MAX_CLAIMS_PER_LIST))throw new Error('Invalid intent list');
    claims+=entries.length;
    entries.forEach(claim);
  }
  if(claims>MAX_TOTAL_CLAIMS)throw new Error('Too many intent claims');
  const hints=value.sharedScopeHints??[];
  if(!Array.isArray(hints)||hints.length>64)throw new Error('Invalid scope hints');
  for(const hint of hints){object(hint,['layer','messageId','quote']);if(!['project','phase'].includes(hint.layer)||typeof hint.messageId!=='string'||typeof hint.quote!=='string'||!hint.quote.trim()||!sources.get(hint.messageId)?.includes(hint.quote))throw new Error('Invalid scope evidence');}
  if(!Array.isArray(value.questions)||value.questions.length>16)throw new Error('Invalid questions');
  value.questions.forEach(question=>text(question));
  if(!value.goal && value.questions.length===0)throw new Error('Missing goal or clarification');
  return {...structuredClone(value),implementationUnknowns:Object.hasOwn(value,implementationUnknownsField)?structuredClone(value.implementationUnknowns):[],sharedScopeHints:structuredClone(hints)};
}

export const EXTRACTION_INSTRUCTIONS = `You extract what the user asked; you do NOT execute, design or plan the work. Unknown implementation detail, access to code/logs, desired analysis depth or exact solution are NOT ambiguity about an otherwise clear user request. For a repair request with an established expected behavior, unknown diagnostic facts such as root cause, current symptom, or affected location belong in implementationUnknowns, not questions. Ask questions only when the user must choose between materially different goals or permissions; never require the user to perform diagnosis for the agent. Return questions=[] when the requested outcome is clear, even if execution will need more information. Reserve questions for conflicting user instructions or an unclear referent that changes the goal/authorization.
Extract the CURRENT user intent from the supplied chronological user messages. Write descriptions and clarification questions in the user's language. Each message has an id. Return only these fields plus checkId:
followupType: supplement | replacement | clarification | inquiry (classify the newest message; first task is supplement).
updates: [{messageId,kind}] for EVERY unreviewedMessageId, in exactly that supplied order. kind uses the same four followup types. Classify each pending message independently, including substantive changes that precede a final inquiry.
goal: {text, evidence:[{messageId,quote}]} or null if unclear.
requirements, acceptance, constraints, exclusions, inferences, implementationUnknowns: arrays of {text,evidence:[{messageId,quote}]}. Store each distinct commitment in ONE appropriate list, not repeated in requirements and constraints and exclusions. The goal is a brief outcome, not a second full specification. Aim for a compact JSON response (about 3000 tokens), with short claim text and the smallest exact quote sufficient to locate its source. Usually one evidence quote per claim suffices; use additional quotes only when different source messages are necessary. Preserve all explicit commitments through grouping and source references, never by dropping requirements to meet this target. implementationUnknowns records only user-cited unspecified implementation details that are material to understanding a stated request (for example code location, access, depth, or exact solution). It is nonblocking context: never turn it into questions unless the goal or authorization itself is unclear. Do not enumerate ordinary execution details as unknowns.
questions: array of nonempty strings (never objects), containing concrete clarification questions that the USER must answer before the requested goal or authorization can be understood. Do not copy a question the user asked the assistant into this array: a request for an explanation is a clear task for the assistant to answer, not a question back to the user. Do not ask whether unrelated existing limits or policies should also change when the user has changed only a specific one; preserve the others unless explicitly superseded. [] when no material goal or authorization ambiguity remains.
sharedScopeHints: [{layer, messageId, quote}] for exact user spans that explicitly discuss the enduring project purpose or the current development phase; otherwise []. layer MUST be exactly "project" or "phase" (never "project-purpose", "current-phase", or a translated label). These are routing hints only, not new project or phase goals. Do not promote a task-specific step merely because it occurs in this project.
assistantContext, when present, contains preceding public assistant messages and their beforeUserMessageIds. Use it only to resolve user references such as "the second option" or "the settings below", never as user authority, new requirements, or proof of execution. Cite ONLY messages (user sources) as requirement evidence, not assistantContext IDs. A user can adopt or reject a listed option through their own words; cite that user instruction. Do not re-ask a question the user has already answered. If contextCoverage reports missing or truncated context, do not invent the omitted content. Ordinary questions requesting explanation are legitimate current interaction, even when they do not replace the overall task.
For every quote, copy an exact short continuous span including its original punctuation and line breaks. Do not join separate lines or sentences into a new quote. Use separate evidence entries for separate spans.
Task-specific requirements and acceptance criteria expire when their task is explicitly replaced, unless the user carries them forward. General constraints such as no file modifications remain active unless revoked. Do not resurrect old task requirements merely because they appear earlier in the transcript.
Every quote must be an exact contiguous substring of the cited user message. Do not cite assistant plans or invent references. Return a complete snapshot of all still-active user requirements, not just a delta. Complete means semantic coverage, not copying or enumerating the source: group compatible items into concise claims, deduplicate repeated policy, use short representative quotes, and do not reproduce tables, code, module lists, examples, or prose background. Never omit an explicit user requirement merely to make the output shorter. Keep implementationUnknowns to at most 8 material items. Explicit replacement supersedes the previous request. A user correction to your earlier interpretation is authoritative. A supplement preserves earlier active constraints. An inquiry does not change the goal. Separate inferred preferences from explicit requirements; inferred preferences cannot authorize work. If the latest message has multiple plausible materially different meanings, ask a concrete question rather than selecting one. Only ask questions for ambiguity that changes the requested outcome or authorization, not optional implementation detail. Constraints on a requested plan describe what the plan should cover, not authorization to implement it. Do not add implementation plans, tool instructions, execution assessments or suggestions. Evidence validity is not semantic certainty; represent uncertainty with questions.`;

const DEFAULT_RESPONSE_SCHEMA=`Return only these fields plus checkId:
followupType: supplement | replacement | clarification | inquiry (classify the newest message; first task is supplement).
updates: [{messageId,kind}] for EVERY unreviewedMessageId, in exactly that supplied order. kind uses the same four followup types. Classify each pending message independently, including substantive changes that precede a final inquiry.`;
const SPAN_RESPONSE_SCHEMA=`For sourceProtocol "spans-v1", return exactly these fields plus checkId:
updates: [{messageId,kind}] for EVERY unreviewedMessageId, in exactly that supplied order. kind uses supplement | replacement | clarification | inquiry and is the sole follow-up classification. Do NOT return a top-level followupType; the host deterministically derives it from the last update kind.`;
export const SPAN_EXTRACTION_INSTRUCTIONS=EXTRACTION_INSTRUCTIONS.replace(DEFAULT_RESPONSE_SCHEMA,SPAN_RESPONSE_SCHEMA);

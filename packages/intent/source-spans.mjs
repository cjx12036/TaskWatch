const MAX_SPAN_CHARACTERS=120;
const sentenceBoundary=new Set(['。','！','？','!','?','；',';','\n','\r']);
const claimLists=['requirements','acceptance','constraints','exclusions','inferences','implementationUnknowns'];

function chunks(text){
  const result=[];let sentence=[];
  const emit=chars=>{while(chars.length){result.push(chars.splice(0,MAX_SPAN_CHARACTERS).join(''));}};
  for(const character of Array.from(text)){
    sentence.push(character);
    if(sentenceBoundary.has(character)){emit(sentence);sentence=[];}
  }
  emit(sentence);
  return result;
}

// IDs describe positions, never text, so identical source text remains distinct evidence.
export function encodeSourceSpans(messages){
  const spanMap=new Map();
  const encoded=messages.map((message,messageIndex)=>{
    if(!message||typeof message.id!=='string'||typeof message.text!=='string')throw new TypeError('Invalid source message');
    const spans=chunks(message.text).map((text,spanIndex)=>{
      if(!text.trim())return {text};
      const id=`s${messageIndex}:${spanIndex}`;
      const span={id,text};spanMap.set(id,{messageId:message.id,quote:text});return span;
    });
    return {id:message.id,spans};
  });
  return {messages:encoded,spanMap};
}

function expandClaim(claim,spanMap){
  if(claim===null||!claim||typeof claim!=='object'||Array.isArray(claim)||!Array.isArray(claim.evidence))return structuredClone(claim);
  return {...structuredClone(claim),evidence:claim.evidence.map(reference=>{
    if(!reference||typeof reference!=='object'||Array.isArray(reference)||Object.keys(reference).length!==1||typeof reference.spanId!=='string')throw new Error('Invalid span evidence');
    const source=spanMap.get(reference.spanId);
    if(!source)throw new Error('Invalid span evidence');
    return structuredClone(source);
  })};
}

export function expandSpanEvidence(proposal,spanMap){
  if(!spanMap||typeof spanMap.get!=='function')throw new TypeError('Invalid span map');
  if(!proposal||typeof proposal!=='object'||Array.isArray(proposal))return structuredClone(proposal);
  const expanded=structuredClone(proposal);
  if(Object.hasOwn(proposal,'goal'))expanded.goal=expandClaim(proposal.goal,spanMap);
  for(const key of claimLists)if(Object.hasOwn(proposal,key))expanded[key]=Array.isArray(proposal[key])?proposal[key].map(claim=>expandClaim(claim,spanMap)):structuredClone(proposal[key]);
  return expanded;
}

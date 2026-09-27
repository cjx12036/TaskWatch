// A wire-only lossless encoding. The authoritative ledger keeps exact quotes.
export function compactSourceQuotes(input){
 const sources=new Map(input.userEvidence.map(message=>[message.id,message.text]));
 const copy=structuredClone(input);
 for(const field of ['requirements','inferences','implementationUnknowns']){
  for(const claim of copy[field]??[])claim.evidence=(claim.evidence??[]).map(ref=>{
   const original=sources.get(ref.messageId);
   if(typeof original!=='string'||typeof ref.quote!=='string'||!ref.quote.trim())throw new Error('Missing exact quote source');
   const start=original.indexOf(ref.quote);
   if(start<0)throw new Error('Missing exact quote source');
   // Repeated wording did not previously identify a particular occurrence.
   // Keep that quote rather than invent a more specific source location.
   if(original.indexOf(ref.quote,start+1)>=0)return ref;
   const end=start+ref.quote.length;
   if(original.slice(start,end)!==ref.quote)throw new Error('Invalid source range');
   const range={messageId:ref.messageId,sourceRange:[start,end]};
   return JSON.stringify(range).length<JSON.stringify(ref).length?range:ref;
  });
 }
 copy.sourceProtocol='source-ranges-v1';
 copy.instruction+='\nSome claim evidence uses sourceRange:[start,end] instead of repeating quote text. These are host-verified UTF-16 offsets, start inclusive and end exclusive, in the complete userEvidence text with that messageId. They preserve exactly the original quote; other evidence still carries quote directly. All user originals and every requirement remain present. This is a storage representation, not new authority. Output citations still use only the referenceCatalog IDs.';
 return copy;
}

export function expandSourceRanges(input){
 const sources=new Map(input.userEvidence.map(message=>[message.id,message.text]));
 const copy=structuredClone(input);
 for(const field of ['requirements','inferences','implementationUnknowns'])for(const claim of copy[field]??[])claim.evidence=(claim.evidence??[]).map(ref=>{
  if(!Object.hasOwn(ref,'sourceRange'))return ref;
  const source=sources.get(ref.messageId),range=ref.sourceRange;
  if(Object.keys(ref).length!==2||typeof source!=='string'||!Array.isArray(range)||range.length!==2||range.some(n=>!Number.isSafeInteger(n))||range[0]<0||range[1]<=range[0]||range[1]>source.length)throw new Error('Invalid source range');
  return {messageId:ref.messageId,quote:source.slice(...range)};
 });
 return copy;
}

// Public captions/descriptions for photographs already served from public trip folders.
// Never expose private collections or unpublished metadata.
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"public, max-age=60","x-content-type-options":"nosniff"}});
export async function onRequestGet({request,env}){
 const prefix=new URL(request.url).searchParams.get("prefix")||"";
 if(!/^trips\/[a-z0-9-]+\/(?:days\/day-(?:0[1-9]|1[0-9]|2[0-4])\/|gallery\/)$/i.test(prefix))
  return json({error:"Invalid photo folder"},400);
 if(!env.PHOTO_DB)return json({photos:{}});
 try{
  const results=await env.PHOTO_DB.prepare("SELECT r2_key,caption,alt_text FROM photos WHERE status='published' AND r2_key LIKE ? LIMIT 500").bind(prefix+"%").all();
  const photos={};
  for(const row of results.results||[]){
   const rest=row.r2_key.slice(prefix.length);
   if(rest.includes("/")||!/\.(?:jpe?g|png|webp|avif|gif)$/i.test(rest))continue;
   photos[row.r2_key]={caption:String(row.caption||"").slice(0,1000),description:String(row.alt_text||"").slice(0,500)};
  }
  return json({photos});
 }catch{return json({photos:{}})}
}

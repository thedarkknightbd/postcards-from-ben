import {currentUser,isOwner,response} from "../../_lib/access-auth.js";

// Drafts are private, stored in PRIVATE_MEDIA, and never written to public GitHub content.
// Only existing days 1-24 of The Long Way Around are editable in this first phase.
const PREFIX="internal/cms-drafts/long-way-around/";
const VALID_DAY=/^(?:0[1-9]|1[0-9]|2[0-4])$/;
const noAccess=()=>response({error:"Not found"},404);
const key=day=>PREFIX+"day-"+day+".json";
function dayOf(request){
 const d=new URL(request.url).searchParams.get("day")||"";
 return VALID_DAY.test(d)?d:null;
}
function validEntry(value,day){
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 if(value.dayNumber!==Number(day))return false;
 if(typeof value.title!=="string"||value.title.length>200)return false;
 for(const k of ["date","route","introTitle","intro","journal"]){
  if(value[k]!==undefined&&(typeof value[k]!=="string"||value[k].length>25000))return false;
 }
 if(value.kilometersDriven!==undefined&&value.kilometersDriven!==null&&
  (!Number.isSafeInteger(value.kilometersDriven)||value.kilometersDriven<0))return false;
 if(!Array.isArray(value.facts)||!Array.isArray(value.stops)||!Array.isArray(value.photos||[])||!Array.isArray(value.videos||[]))return false;
 if(value.facts.length>50||value.stops.length>150)return false;
 if(JSON.stringify(value).length>75000)return false;
 // Strictly prohibit code execution keys at any level of user-submitted JSON.
 const badKeys=new Set(["__proto__","prototype","constructor"]);
 function safe(x,depth=0){
  if(depth>12)return false;
  if(!x||typeof x!=="object")return true;
  return Object.keys(x).every(k=>!badKeys.has(k)&&safe(x[k],depth+1));
 }
 return safe(value);
}
export async function onRequest({request,env}){
 let user=null;try{user=await currentUser(request,env)}catch{}
 if(!isOwner(user))return noAccess();
 if(!env.PRIVATE_MEDIA)return response({error:"Private draft storage unavailable"},503);
 const day=dayOf(request);
 if(request.method==="GET"&&!day){
  try{
   const result=await env.PRIVATE_MEDIA.list({prefix:PREFIX,limit:100});
   return response({draft_days:(result.objects||[]).map(x=>/^day-(\d\d)\.json$/.exec(x.key.slice(PREFIX.length))?.[1]).filter(Boolean)});
  }catch{return response({error:"Cannot read draft index"},503)}
 }
 if(!day)return response({error:"Invalid day"},400);
 if(request.method==="GET"){
  try{
   const item=await env.PRIVATE_MEDIA.get(key(day));
   if(!item)return response({draft:null});
   const entry=await item.json();
   return response({draft:entry});
  }catch{return response({error:"Could not load draft"},503)}
 }
 if(request.method!=="POST"&&request.method!=="DELETE")return response({error:"Method not allowed"},405);
 if(request.headers.get("origin")!==new URL(request.url).origin)return response({error:"Invalid origin"},403);
 if(request.method==="DELETE"){
  try{await env.PRIVATE_MEDIA.delete(key(day));return response({ok:true})}
  catch{return response({error:"Could not discard draft"},503)}
 }
 if(Number(request.headers.get("content-length")||0)>80000)return response({error:"Draft exceeds limit"},413);
 let payload;try{payload=await request.json()}catch{return response({error:"Invalid JSON"},400)}
 if(!validEntry(payload?.entry,day))return response({error:"Invalid day content"},400);
 const draft={entry:payload.entry,saved_at:new Date().toISOString(),status:"draft",day_number:Number(day)};
 try{
  await env.PRIVATE_MEDIA.put(key(day),JSON.stringify(draft),{
   httpMetadata:{contentType:"application/json",cacheControl:"private, no-store"}
  });
  return response({ok:true,saved_at:draft.saved_at});
 }catch{return response({error:"Could not save draft"},503)}
}

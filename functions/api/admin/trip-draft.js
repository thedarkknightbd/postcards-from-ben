import {currentUser,isOwner,response} from "../../_lib/access-auth.js";
import {readGithub,validSha} from "../../_lib/postcard-github.js";

// Trip-level private drafts for the five existing non-daily adventures.
// Existing public postcard.json files are never overwritten by this endpoint.
const TRIPS=new Set([
 "winter-on-the-black-sea","autumn-in-hungary","a-special-convention",
 "under-the-mara-sky","an-afternoon-with-giants"
]);
const PREFIX="internal/cms-drafts/past-adventures/";
const FIELDS=["title","kicker","subtitle","sectionLabel","introTitle","story","photoTitle","photoPlaceholder"];
const hidden=()=>response({error:"Not found"},404);
const route=request=>{
 const slug=new URL(request.url).searchParams.get("trip");
 return TRIPS.has(slug)?slug:null;
};
const safeObject=(value,depth=0)=>{
 if(depth>8)return false;
 if(!value||typeof value!=="object")return true;
 return Object.keys(value).every(key=>!["__proto__","constructor","prototype"].includes(key)&&safeObject(value[key],depth+1));
};
function validate(entry){
 if(!entry||typeof entry!=="object"||Array.isArray(entry)||!safeObject(entry))return false;
 if(typeof entry.title!=="string"||!entry.title.trim()||entry.title.length>200)return false;
 for(const field of FIELDS){
  if(entry[field]!==undefined&&(typeof entry[field]!=="string"||entry[field].length>(field==="story"?25000:1000)))return false;
 }
 return JSON.stringify(entry).length<=45000;
}
export async function onRequest({request,env}){
 let owner=null;try{owner=await currentUser(request,env)}catch{}
 if(!isOwner(owner))return hidden();
 if(!env.PRIVATE_MEDIA)return response({error:"Private draft storage is unavailable"},503);
 const trip=route(request);
 if(!trip)return response({error:"Unknown adventure"},400);
 const key=PREFIX+trip+".json";
 if(request.method==="GET"){
  try{
   const obj=await env.PRIVATE_MEDIA.get(key);
   return response({draft:obj?await obj.json():null});
  }catch{return response({error:"Could not read draft"},503)}
 }
 if(request.method!=="POST"&&request.method!=="DELETE")return response({error:"Method not allowed"},405);
 if(request.headers.get("origin")!==new URL(request.url).origin)return response({error:"Invalid origin"},403);
 if(request.method==="DELETE"){
  try{await env.PRIVATE_MEDIA.delete(key);return response({ok:true})}
  catch{return response({error:"Could not discard draft"},503)}
 }
 if(Number(request.headers.get("content-length")||0)>50000)return response({error:"Draft too large"},413);
 let payload;try{payload=await request.json()}catch{return response({error:"Invalid JSON"},400)}
 if(!validate(payload?.entry))return response({error:"Invalid postcard content"},400);
 let previous=null;
 try{const obj=await env.PRIVATE_MEDIA.get(key);previous=obj?await obj.json():null}
 catch{return response({error:"Cannot check previous draft"},503)}
 let baseSha=previous?.base_sha||null;
 if(!previous){
  if(!validSha(payload?.base_sha))return response({error:"Reload the adventure before creating a draft"},409);
  try{
   const source=await readGithub(env,"trips/"+trip+"/postcard.json");
   if(source.sha!==payload.base_sha)return response({error:"Published file has changed. Reload the adventure before saving."},409);
   baseSha=source.sha;
  }catch(e){return response({error:e.detail||"Cannot verify published source"},e.status||503)}
 }
 const draft={entry:payload.entry,status:"draft",saved_at:new Date().toISOString(),trip,base_sha:baseSha};
 try{
  await env.PRIVATE_MEDIA.put(key,JSON.stringify(draft),{
   httpMetadata:{contentType:"application/json",cacheControl:"private, no-store"}
  });
  return response({ok:true,saved_at:draft.saved_at,base_sha:baseSha,publishable:validSha(baseSha)});
 }catch{return response({error:"Could not save private postcard draft"},503)}
}

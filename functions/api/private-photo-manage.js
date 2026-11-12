import {privateMember,privateResponse,owner,privateKey,collections} from "../_lib/private-media.js";

const uuidPattern=/^[0-9a-f-]{36}$/i;
const photoId=key=>key?.split("/").pop()?.split(".")[0];
const metadataKey=key=>"internal/photo-details/"+photoId(key)+".json";
const fieldSizes={title:160,caption:3000,alt_text:500,original_filename:260,
 taken_at:80,country:100,location:160,visit:160,exhibit:160,
 camera_make:100,camera_model:120,lens_model:160,software:120,
 aperture:40,shutter_speed:40,iso:40,focal_length_mm:40,
 gps_altitude_m:40,latitude:40,longitude:40,timezone:80};
const cleanMetadata=input=>{
 const result={};
 for(const [field,max] of Object.entries(fieldSizes)){
  if(Object.prototype.hasOwnProperty.call(input,field)){
   const value=input[field];
   if(value!==null&&typeof value!=="string"&&typeof value!=="number")throw Error("Invalid "+field);
   result[field]=String(value??"").trim().slice(0,max);
  }
 }
 for(const [key,bound] of [["latitude",90],["longitude",180]]){
  if(result[key]&&(!Number.isFinite(Number(result[key]))||Math.abs(Number(result[key]))>bound))throw Error("Invalid "+key);
 }
 return result;
};
const safeKey=async(env,key)=>privateKey(key)&&Boolean(await env.PRIVATE_MEDIA.head(key));
const readMetadata=async(env,key)=>{
 const object=await env.PRIVATE_MEDIA.get(metadataKey(key));
 if(!object)return {};
 try{return await object.json()}catch{return {}}
};
const writeMetadata=async(env,key,details)=>{
 await env.PRIVATE_MEDIA.put(metadataKey(key),JSON.stringify(details),{
  httpMetadata:{contentType:"application/json",cacheControl:"private, no-store"}
 });
};
async function validAlbum(env,collection,albumId){
 if(!albumId)return true;
 if(!uuidPattern.test(albumId))return false;
 const object=await env.PRIVATE_MEDIA.get("internal/album-index-v1.json");
 if(!object)return false;
 const albums=await object.json();
 return Array.isArray(albums)&&albums.some(a=>a.id===albumId&&a.collection===collection);
}
export async function onRequest({request,env}){
 const member=await privateMember(request,env);
 if(!member)return privateResponse({error:"Not found"},404);
 if(request.method==="GET"){
  const key=new URL(request.url).searchParams.get("key");
  if(!key||!(await safeKey(env,key)))return privateResponse({error:"Photo not found"},404);
  return privateResponse({key,metadata:await readMetadata(env,key)});
 }
 if(request.method!=="POST")return privateResponse({error:"Method not allowed"},405);
 if(!owner(member))return privateResponse({error:"Not found"},404);
 if(request.headers.get("origin")!==new URL(request.url).origin)return privateResponse({error:"Invalid origin"},403);
 if(Number(request.headers.get("content-length")||0)>16000)return privateResponse({error:"Request too large"},413);
 let body;try{body=await request.json()}catch{return privateResponse({error:"Invalid request"},400)}
 const key=body?.key,operation=body?.operation;
 if(!["edit","move","delete"].includes(operation)||!(await safeKey(env,key)))return privateResponse({error:"Invalid photo or operation"},400);
 if(operation==="edit"){
  let update;try{update=cleanMetadata(body.metadata||{})}catch(e){return privateResponse({error:e.message},400)}
  const old=await readMetadata(env,key);
  const value={...old,...update,updated_at:new Date().toISOString()};
  await writeMetadata(env,key,value);
  return privateResponse({ok:true,key,metadata:value});
 }
 if(operation==="move"){
  const collection=String(body.collection||"");
  const albumId=String(body.album||"");
  if(!collections.has(collection)||!(await validAlbum(env,collection,albumId)))return privateResponse({error:"Invalid destination"},400);
  const name=key.split("/").pop();
  const next="albums/"+collection+"/"+(albumId?albumId+"/":"")+name;
  if(next===key)return privateResponse({ok:true,key});
  if(await env.PRIVATE_MEDIA.head(next))return privateResponse({error:"Destination already contains this photo"},409);
  const original=await env.PRIVATE_MEDIA.get(key);
  if(!original)return privateResponse({error:"Photo not found"},404);
  await env.PRIVATE_MEDIA.put(next,original.body,{
   httpMetadata:{contentType:original.httpMetadata?.contentType||"image/jpeg",cacheControl:"private, no-store"},
   customMetadata:original.customMetadata
  });
  // Only remove the old object after the new object is confirmed present.
  if(!(await env.PRIVATE_MEDIA.head(next)))return privateResponse({error:"Move verification failed"},503);
  await env.PRIVATE_MEDIA.delete(key);
  return privateResponse({ok:true,key:next,metadata:await readMetadata(env,next)});
 }
 if(body.confirm!==true)return privateResponse({error:"Deletion requires confirmation"},400);
 // Remove photo before metadata. Retry can remove orphan metadata by maintenance tooling.
 await env.PRIVATE_MEDIA.delete(key);
 await env.PRIVATE_MEDIA.delete(metadataKey(key));
 return privateResponse({ok:true,deleted:key});
}
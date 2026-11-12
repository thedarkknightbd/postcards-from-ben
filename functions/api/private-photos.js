import {privateMember, privateResponse, owner, collections, fileTypes} from "../_lib/private-media.js";
import {extractJpegMetadata} from "../_lib/jpeg-exif.js";

const albumIdPattern=/^[0-9a-f-]{36}$/i;
async function validateAlbum(env, collection, albumId){
 if(!albumId)return true; // Legacy photos at collection root
 if(!albumIdPattern.test(albumId))return false;
 const index=await env.PRIVATE_MEDIA.get("internal/album-index-v1.json");
 if(!index)return false;
 const albums=await index.json();
 return Array.isArray(albums)&&albums.some(a=>a.id===albumId&&a.collection===collection);
}
function prefixFor(collection,albumId){
 return "albums/"+collection+"/"+(albumId?albumId+"/":"");
}
export async function onRequestGet({request,env}){
 if(!(await privateMember(request,env)))return privateResponse({error:"Not found"},404);
 const qs=new URL(request.url).searchParams;
 const collection=qs.get("collection");
 const albumId=qs.get("album")||"";
 if(!collections.has(collection)||!(await validateAlbum(env,collection,albumId)))return privateResponse({error:"Invalid album"},400);
 const prefix=prefixFor(collection,albumId);
 const items=[];let cursor;
 do{
  const page=await env.PRIVATE_MEDIA.list({prefix,limit:100,cursor});
  for(const object of page.objects){
   const remainder=object.key.slice(prefix.length);
   if(remainder&&!remainder.includes("/")&&/\.(jpg|jpeg|png|webp|avif)$/i.test(remainder))
    items.push({key:object.key,uploaded:object.uploaded,size:object.size});
  }
  cursor=page.truncated?page.cursor:undefined;
 }while(cursor&&items.length<300);
 items.sort((a,b)=>new Date(b.uploaded)-new Date(a.uploaded));
 return privateResponse({items,collection,albumId});
}
export async function onRequestPost({request,env}){
 const member=await privateMember(request,env);
 if(!member||!owner(member))return privateResponse({error:"Not found"},404);
 if(request.headers.get("origin")!==new URL(request.url).origin)return privateResponse({error:"Invalid origin"},403);
 if(Number(request.headers.get("content-length")||0)>16*1024*1024)return privateResponse({error:"Upload too large"},413);
 let form;try{form=await request.formData()}catch{return privateResponse({error:"Invalid upload"},400)}
 const collection=String(form.get("collection")||"");
 const albumId=String(form.get("album")||"");
 const file=form.get("file");
 if(!collections.has(collection)||!(await validateAlbum(env,collection,albumId))||!(file instanceof File))
  return privateResponse({error:"Choose a valid gallery and image"},400);
 const ext=fileTypes.get(file.type);
 if(!ext||file.size<1||file.size>12*1024*1024)return privateResponse({error:"Use JPEG, PNG, WebP, or AVIF up to 12 MB"},400);
 const head=new Uint8Array(await file.slice(0,16).arrayBuffer());
 const starts=b=>b.every((v,i)=>head[i]===v);
 const valid=file.type==="image/jpeg"?starts([255,216,255]):
   file.type==="image/png"?starts([137,80,78,71,13,10,26,10]):
   file.type==="image/webp"?String.fromCharCode(...head.slice(0,4))==="RIFF"&&String.fromCharCode(...head.slice(8,12))==="WEBP":
   file.type==="image/avif"?String.fromCharCode(...head.slice(4,8))==="ftyp"&&["avif","avis"].includes(String.fromCharCode(...head.slice(8,12))):false;
 if(!valid)return privateResponse({error:"Image file does not match its type"},400);
 const key=prefixFor(collection,albumId)+crypto.randomUUID()+"."+ext;
 const body=await file.arrayBuffer();
 const source=file.type==="image/jpeg"?extractJpegMetadata(body):{};
 const metadata={
  ...source,original_filename:file.name.slice(0,260),
  file_size_bytes:file.size,mime_type:file.type,
  uploaded_at:new Date().toISOString()
 };
 // Save original image unchanged, including its embedded EXIF bytes.
 await env.PRIVATE_MEDIA.put(key,body,{httpMetadata:{contentType:file.type,cacheControl:"private, no-store"}});
 try {
  await env.PRIVATE_MEDIA.put("internal/photo-details/"+key.split("/").pop().split(".")[0]+".json",
   JSON.stringify(metadata),{httpMetadata:{contentType:"application/json",cacheControl:"private, no-store"}});
 }catch(error){
  // A photo must never be silently accepted if its metadata couldn't be stored.
  await env.PRIVATE_MEDIA.delete(key);
  return privateResponse({error:"Could not store photo metadata; upload was rolled back"},503);
 }
 return privateResponse({ok:true,key,metadata},201);
}
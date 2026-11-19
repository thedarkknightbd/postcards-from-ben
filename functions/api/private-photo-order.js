import {privateMember,privateResponse,owner,collections,privateKey} from "../_lib/private-media.js";
const idPattern=/^[0-9a-f-]{36}$/i;
const orderKey=(collection,album)=>"internal/private-photo-order/"+collection+"/"+(album||"root")+".json";
const prefixFor=(collection,album)=>"albums/"+collection+"/"+(album?album+"/":"");
async function validAlbum(env,collection,album){
 if(!collections.has(collection)||album&&!idPattern.test(album))return false;
 if(!album)return true;
 const raw=await env.PRIVATE_MEDIA.get("internal/album-index-v1.json");
 if(!raw)return false;
 const albums=await raw.json();
 return Array.isArray(albums)&&albums.some(a=>a.id===album&&a.collection===collection);
}
export async function onRequestPost({request,env}){
 const member=await privateMember(request,env);
 if(!member||!owner(member))return privateResponse({error:"Not found"},404);
 if(request.headers.get("origin")!==new URL(request.url).origin)return privateResponse({error:"Invalid origin"},403);
 if(Number(request.headers.get("content-length")||0)>65000)return privateResponse({error:"Request too large"},413);
 let body;
 try{body=await request.json()}catch{return privateResponse({error:"Invalid request"},400)}
 const collection=String(body?.collection||""),album=String(body?.album||"");
 if(!(await validAlbum(env,collection,album)))return privateResponse({error:"Invalid album"},400);
 const keys=body?.keys;
 if(!Array.isArray(keys)||keys.length>300||new Set(keys).size!==keys.length)
  return privateResponse({error:"Invalid photo order"},400);
 const prefix=prefixFor(collection,album);
 if(keys.some(key=>!privateKey(key)||!key.startsWith(prefix)||key.slice(prefix.length).includes("/")))
  return privateResponse({error:"Invalid photo keys"},400);
 // Only accept a complete reordering of the photos actually in this album.
 // Prevent disappearing photos due to incomplete paginated lists.
 const actual=[];let cursor;
 do{
  const result=await env.PRIVATE_MEDIA.list({prefix,limit:100,cursor});
  for(const obj of result.objects||[]){
   const remainder=obj.key.slice(prefix.length);
   if(remainder&&!remainder.includes("/")&&privateKey(obj.key))actual.push(obj.key);
  }
  if(actual.length>300)return privateResponse({error:"Album exceeds ordering limit"},409);
  cursor=result.truncated?result.cursor:undefined;
 }while(cursor);
 const found=new Set(actual);
 if(actual.length!==keys.length||keys.some(key=>!found.has(key)))
  return privateResponse({error:"Album changed. Reload before reordering."},409);
 await env.PRIVATE_MEDIA.put(orderKey(collection,album),JSON.stringify(keys),{
  httpMetadata:{contentType:"application/json",cacheControl:"private, no-store"}
 });
 return privateResponse({ok:true,count:keys.length});
}

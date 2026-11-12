import {privateMember, privateResponse, owner, collections} from "../_lib/private-media.js";
const indexKey="internal/album-index-v1.json";
const idPattern=/^[0-9a-f-]{36}$/i;
async function readIndex(env){
 const raw=await env.PRIVATE_MEDIA.get(indexKey);
 if(!raw)return [];
 const data=await raw.json();
 if(!Array.isArray(data)||data.length>1000)throw Error("Album index unavailable");
 return data;
}
export async function onRequestGet({request,env}){
 if(!(await privateMember(request,env)))return privateResponse({error:"Not found"},404);
 try {
  const albums=await readIndex(env);
  return privateResponse({albums});
 }catch{return privateResponse({error:"Unable to load albums"},503)}
}
export async function onRequestPost({request,env}){
 const member=await privateMember(request,env);
 if(!member||!owner(member))return privateResponse({error:"Not found"},404);
 if(request.headers.get("origin")!==new URL(request.url).origin)return privateResponse({error:"Invalid origin"},403);
 let body;try{body=await request.json()}catch{return privateResponse({error:"Invalid request"},400)}
 const collection=String(body?.collection||"");
 const title=String(body?.title||"").trim();
 const parentId=body?.parentId==null?"":String(body.parentId);
 if(!collections.has(collection)||title.length<2||title.length>90||/[^\p{L}\p{N}\s.,'()&–-]/u.test(title))
  return privateResponse({error:"Enter an album title (2–90 characters)"},400);
 if(parentId&&!idPattern.test(parentId))return privateResponse({error:"Invalid parent album"},400);
 try {
  const albums=await readIndex(env);
  if(parentId&&!albums.some(a=>a.id===parentId&&a.collection===collection))
   return privateResponse({error:"Parent album not found"},404);
  if(albums.length>=1000)return privateResponse({error:"Album limit reached"},409);
  if(albums.some(a=>a.collection===collection&&a.parentId===parentId&&a.title.toLowerCase()===title.toLowerCase()))
   return privateResponse({error:"An album with this name already exists here"},409);
  const album={id:crypto.randomUUID(),collection,parentId,title,createdAt:new Date().toISOString()};
  await env.PRIVATE_MEDIA.put(indexKey,JSON.stringify([...albums,album]),{
   httpMetadata:{contentType:"application/json",cacheControl:"private, no-store"}
  });
  return privateResponse({album},201);
 }catch{return privateResponse({error:"Could not create album"},503)}
}
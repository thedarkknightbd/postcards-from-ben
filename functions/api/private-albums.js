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
 if(!collections.has(collection)||title.length<2||title.length>90||/[^\p{L}\p{N}\s.,'()&–—-]/u.test(title))
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
export async function onRequestPatch({request,env}){
 const member=await privateMember(request,env);
 if(!member||!owner(member))return privateResponse({error:"Not found"},404);
 if(request.headers.get("origin")!==new URL(request.url).origin)return privateResponse({error:"Invalid origin"},403);
 if(Number(request.headers.get("content-length")||0)>6000)return privateResponse({error:"Request too large"},413);
 let body;try{body=await request.json()}catch{return privateResponse({error:"Invalid request"},400)}
 const id=String(body?.id||""),operation=String(body?.operation||"");
 if(!idPattern.test(id)||!["rename","move","delete"].includes(operation))return privateResponse({error:"Invalid operation"},400);
 try{
  const albums=await readIndex(env),current=albums.find(a=>a.id===id);
  if(!current)return privateResponse({error:"Album not found"},404);
  let next;
  if(operation==="rename"){
   const title=String(body.title||"").trim();
   if(title.length<2||title.length>90||/[^\p{L}\p{N}\s.,'()&–—-]/u.test(title))
    return privateResponse({error:"Enter a valid album name (2–90 characters)"},400);
   if(albums.some(a=>a.id!==id&&a.collection===current.collection&&a.parentId===current.parentId&&a.title.toLowerCase()===title.toLowerCase()))
    return privateResponse({error:"Another album here already has that name"},409);
   next=albums.map(a=>a.id===id?{...a,title}:a);
  }else if(operation==="move"){
   const parentId=body.parentId==null?"":String(body.parentId);
   if(parentId&&!idPattern.test(parentId))return privateResponse({error:"Invalid destination"},400);
   const destination=albums.find(a=>a.id===parentId);
   if(parentId&&(!destination||destination.collection!==current.collection))return privateResponse({error:"Destination must be in the same collection"},400);
   let walker=destination,count=0;
   while(walker&&count++<1000){
    if(walker.id===id)return privateResponse({error:"An album cannot be moved inside itself or its descendants"},409);
    walker=albums.find(a=>a.id===walker.parentId);
   }
   if(count>=1000)return privateResponse({error:"Invalid album hierarchy"},409);
   if(albums.some(a=>a.id!==id&&a.collection===current.collection&&a.parentId===parentId&&a.title.toLowerCase()===current.title.toLowerCase()))
    return privateResponse({error:"Destination already has an album with this name"},409);
   next=albums.map(a=>a.id===id?{...a,parentId}:a);
  }else{
   if(body.confirm!==true)return privateResponse({error:"Confirm album deletion"},400);
   if(albums.some(a=>a.parentId===id))return privateResponse({error:"Move or delete the subalbums first"},409);
   // An album ID is also the directory name in R2; never orphan stored photos.
   const prefix="albums/"+current.collection+"/"+id+"/";
   const page=await env.PRIVATE_MEDIA.list({prefix,limit:1});
   if(page.objects?.length||page.truncated)return privateResponse({error:"This album contains photographs. Move them before deleting the album."},409);
   next=albums.filter(a=>a.id!==id);
  }
  await env.PRIVATE_MEDIA.put(indexKey,JSON.stringify(next),{
   httpMetadata:{contentType:"application/json",cacheControl:"private, no-store"}
  });
  return privateResponse({ok:true,albums:next});
 }catch{return privateResponse({error:"Could not update album"},503)}
}

import {currentUser,isOwner,allowed,response} from "../_lib/access-auth.js";
import {LOCATION_CONFIG_KEY,locationSharingState,workerVerified,readProtectedWorker} from "../_lib/location-security.js";

const notFound=()=>response({error:"Not found"},404);
export async function onRequest({request,env}){
 let user;try{user=await currentUser(request,env)}catch{return notFound()}
 if(!user)return notFound();
 const owner=isOwner(user),viewer=owner||allowed(user,"location");
 if(!viewer)return notFound();
 if(request.method==="GET"){
  const state=await locationSharingState(env);
  return response({sharing:state.sharing,can_manage:owner,worker_ready:workerVerified(env),available:state.available,updated_at:state.updated_at||null});
 }
 if(request.method!=="POST")return response({error:"Method not allowed"},405);
 if(!owner)return notFound();
 if(request.headers.get("origin")!==new URL(request.url).origin)return response({error:"Invalid origin"},403);
 if(!env.PRIVATE_MEDIA)return response({error:"Private storage is not configured"},503);
 if(Number(request.headers.get("content-length")||0)>1024)return response({error:"Request too large"},413);
 let body;try{body=await request.json()}catch{return response({error:"Invalid request"},400)}
 if(typeof body?.sharing!=="boolean")return response({error:"Expected a sharing on/off value"},400);
 // Do not allow enabling until the Worker read route and permission gate are deployed and verified.
 if(body.sharing){
  if(!workerVerified(env))return response({error:"Protected Worker integration is not configured or verified. Sharing remains off."},409);
  const probe=await readProtectedWorker(env);
  if(!probe.ok)return response({error:"Protected Worker health check failed. Sharing remains off."},409);
 }
 const updated_at=new Date().toISOString();
 try{
  await env.PRIVATE_MEDIA.put(LOCATION_CONFIG_KEY,JSON.stringify({sharing:body.sharing,updated_at}),{
   httpMetadata:{contentType:"application/json",cacheControl:"private, no-store"}
  });
  return response({sharing:body.sharing,can_manage:true,available:true,updated_at});
 }catch{return response({error:"Could not save sharing control"},503)}
}
import {currentUser,isOwner,allowed,response} from "../_lib/access-auth.js";
import {locationSharingState,recordingGateReady,LOCATION_CONFIG_KEY} from "../_lib/location-security.js";
const hidden=()=>response({error:"Not found"},404);
export async function onRequest({request,env}){
 let user;try{user=await currentUser(request,env)}catch{return hidden()}
 if(!user)return hidden();
 const owner=isOwner(user),viewer=owner||allowed(user,"location");
 if(!viewer)return hidden();
 if(request.method==="GET"){
  const state=await locationSharingState(env);
  // Check the actual Worker gate, not merely the presence of a token.
  const ready=state.available&&await recordingGateReady(env);
  return response({sharing:state.sharing,can_manage:owner,worker_ready:ready,available:state.available,recording_control_ready:ready,updated_at:state.enabled_at||null});
 }
 if(request.method!=="POST")return response({error:"Method not allowed"},405);
 if(!owner)return hidden();
 if(request.headers.get("origin")!==new URL(request.url).origin)return response({error:"Invalid origin"},403);
 if(Number(request.headers.get("content-length")||0)>1024)return response({error:"Request too large"},413);
 let body;try{body=await request.json()}catch{return response({error:"Invalid JSON"},400)}
 if(typeof body?.sharing!=="boolean")return response({error:"Expected a boolean sharing setting"},400);
 if(!env.LOCATION_CONTROL_DB)return response({error:"Master control database is not configured; recording may still be active in OwnTracks."},503);
 const current=await locationSharingState(env);
 if(!current.available)return response({error:"Master control table is not initialized. No changes made."},503);
 if(body.sharing&&!(await recordingGateReady(env)))return response({error:"Recording-aware Worker is not ready. Enable remains blocked."},409);
 const now=new Date().toISOString();
 try{
  // The D1 master state is authoritative for both Worker recording and Pages sharing.
  // Updating it never touches historical location data.
  const query=body.sharing?
   "UPDATE location_control SET enabled=1,enabled_at=? WHERE id=1":
   "UPDATE location_control SET enabled=0 WHERE id=1";
  const stmt=env.LOCATION_CONTROL_DB.prepare(query);
  await (body.sharing?stmt.bind(now):stmt).run();
  // Clear the legacy R2 website viewing flag when available; it is never
  // consulted by the new master-switch code.
  if(env.PRIVATE_MEDIA){
   try{await env.PRIVATE_MEDIA.put(LOCATION_CONFIG_KEY,JSON.stringify({sharing:false,updated_at:now}),
    {httpMetadata:{contentType:"application/json",cacheControl:"private, no-store"}})}
   catch{ /* legacy flag is no longer authoritative */ }
  }
  return response({sharing:body.sharing,can_manage:true,available:true,recording_control_ready:true,updated_at:body.sharing?now:current.enabled_at});
 }catch{return response({error:"Could not save the master control state; check Cloudflare D1 configuration."},503)}
}
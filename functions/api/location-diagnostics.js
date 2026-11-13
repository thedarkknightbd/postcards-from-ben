import {currentUser,isOwner,response} from "../_lib/access-auth.js";
import {upstreamConfigured,sanitizeLocation,locationTransport,requestLocationWorker} from "../_lib/location-security.js";

const noStore={"cache-control":"private, no-store"};
function safeStatus(status){return [200,400,401,403,404,405,429,500,502,503,504].includes(status)?status:null}
export async function onRequestGet({request,env}){
 let user;try{user=await currentUser(request,env)}catch{}
 if(!isOwner(user))return response({error:"Not found"},404);
 if(!upstreamConfigured(env))return response({configured:false,anonymous:"not_checked",authenticated:"not_checked",message:"The Pages read-token secret is missing."},200,noStore);
 const state={configured:true,transport:locationTransport(env),anonymous:"unavailable",authenticated:"not_checked",anonymous_status:null,authenticated_status:null};
 try{
  const r=await requestLocationWorker(env,false);
  state.anonymous_status=safeStatus(r.status);
  state.anonymous=[401,403,404].includes(r.status)?"blocked":r.status===200?"EXPOSED":"unexpected";
 }catch{state.anonymous="connection_error"}
 if(state.anonymous!=="blocked"){
  state.message=state.anonymous==="EXPOSED"?"Worker returned success without authentication. Do not enable sharing.":state.transport==="public_url"?"The public Worker URL could not be verified. Configure an internal LOCATION_WORKER service binding on your Pages project.":"Could not verify that unauthenticated requests are blocked through the internal service binding.";
  return response(state,200,noStore);
 }
 try{
  const r=await requestLocationWorker(env,true);
  state.authenticated_status=safeStatus(r.status);
  if(r.status===401||r.status===403){state.authenticated="rejected";state.message="Worker rejected the Pages read token. Verify that both services use the same LOCATION_READ_TOKEN value.";return response(state,200,noStore)}
  if(r.status===404){
   try{
    const gate=await requestLocationWorker(env,true,"/control-status");
    if(gate.ok){
     const data=await gate.json();
     if(data.recording_gate===true&&data.control_store==="D1"){
      state.authenticated="recording_gate_ready";
      state.message="Master recording gate is working. No new position is available while sharing is OFF or before OwnTracks sends an update.";
      return response(state,200,noStore);
     }
    }
   }catch{}
   state.authenticated="not_found";
   state.message="Location endpoint returned 404. Worker may be waiting for an update, or the control endpoint is not deployed.";
   return response(state,200,noStore)
  }
  if(!r.ok){state.authenticated="upstream_error";state.message="Worker responded with an error status.";return response(state,200,noStore)}
  if(!String(r.headers.get("content-type")||"").toLowerCase().includes("application/json")){state.authenticated="unexpected_content";state.message="Worker response is not JSON.";return response(state,200,noStore)}
  const body=await r.text();
  if(body.length>12000){state.authenticated="oversized";state.message="Worker response is too large.";return response(state,200,noStore)}
  const data=JSON.parse(body);
  if(!sanitizeLocation(data)){
   state.authenticated="no_usable_position";
   state.message="Token was accepted but the response contains no coordinates in the supported format. Location may not have been collected recently.";
   return response(state,200,noStore)
  }
  state.authenticated="valid_location";
  state.message="The Worker blocked anonymous access and returned a valid authenticated location.";
  return response(state,200,noStore);
 }catch{
  state.authenticated="connection_error";state.message="A connection or response parsing error occurred when contacting the Worker.";
  return response(state,200,noStore);
 }
}
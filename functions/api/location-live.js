import {currentUser,isOwner,allowed,response} from "../_lib/access-auth.js";
import {locationSharingState,readProtectedWorker,recordingGateReady} from "../_lib/location-security.js";
const hidden=()=>response({error:"Not found"},404);
export async function onRequestGet({request,env}){
 let member=null;try{member=await currentUser(request,env)}catch{return hidden()}
 if(!(isOwner(member)||allowed(member,"location")))return hidden();
 const state=await locationSharingState(env);
 if(!state.sharing)return response({error:"Location sharing is off"},403);
 if(!(await recordingGateReady(env)))return response({error:"Recording gate is not verified"},503);
 const result=await readProtectedWorker(env);
 if(!result.ok)return response({error:result.status===404?"Waiting for a new OwnTracks position":"Live location unavailable"},result.status===404?404:503);
 // Coordinates never cached and never exposed without session + sharing checks.
 return response({location:result.location});
}
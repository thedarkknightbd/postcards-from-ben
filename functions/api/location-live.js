import {currentUser,isOwner,allowed,response} from "../_lib/access-auth.js";
import {locationSharingState,readProtectedWorker} from "../_lib/location-security.js";
const hidden=()=>response({error:"Not found"},404);
export async function onRequestGet({request,env}){
 let member=null;try{member=await currentUser(request,env)}catch{return hidden()}
 if(!(isOwner(member)||allowed(member,"location")))return hidden();
 const state=await locationSharingState(env);
 if(!state.sharing)return response({error:"Location sharing is off"},403);
 const result=await readProtectedWorker(env);
 if(!result.ok)return response({error:"Live location unavailable"},503);
 // Coordinates never cached and never exposed without session + sharing checks.
 return response({location:result.location});
}
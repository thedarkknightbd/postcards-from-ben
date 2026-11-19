import {currentUser,isOwner} from "./access-auth.js";

// Accept the established owner session only for same-origin browser requests.
// The historical media upload token remains supported by legacy tooling.
export async function mediaAuthorized(request,env,{write=false}={}){
 const supplied=request.headers.get("authorization")||"";
 if(env.MEDIA_UPLOAD_TOKEN&&supplied==="Bearer "+env.MEDIA_UPLOAD_TOKEN)
  return true;
 // If a caller explicitly supplies another Authorization header, never
 // silently treat it as an owner-cookie request.
 if(supplied)return false;
 if(write&&request.headers.get("origin")!==new URL(request.url).origin)
  return false;
 try{return isOwner(await currentUser(request,env))}
 catch{return false}
}

import {currentUser,allowed,isOwner} from "../_lib/access-auth.js";
const deny=()=>new Response("Not found",{status:404,headers:{"cache-control":"no-store","x-robots-tag":"noindex, nofollow"}});
export async function onRequest(context){
 const {request,env}=context;
 if(!env.ACCESS_DB||!env.ACCESS_SESSION_SECRET)return deny();
 let user,setting;
 try{user=await currentUser(request,env);setting=await env.ACCESS_DB.prepare("SELECT live_location_enabled FROM access_privacy WHERE id=1").first();}catch{return deny();}
 if(setting?.live_location_enabled!==1||(!isOwner(user)&&!allowed(user,"location")))return deny();
 const result=await context.next();
 const headers=new Headers(result.headers);
 headers.set("cache-control","private, no-store");headers.set("x-robots-tag","noindex, nofollow");
 return new Response(result.body,{status:result.status,headers});
}

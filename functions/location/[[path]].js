import {currentUser,isOwner,allowed} from "../_lib/access-auth.js";
export async function onRequest(context){
 let user;try{user=await currentUser(context.request,context.env)}catch{}
 if(!(isOwner(user)||allowed(user,"location")))return new Response("Not found",{status:404,headers:{"cache-control":"private, no-store","x-robots-tag":"noindex,nofollow"}});
 const result=await context.next();const headers=new Headers(result.headers);
 headers.set("cache-control","private, no-store");headers.set("x-robots-tag","noindex,nofollow");
 return new Response(result.body,{status:result.status,headers});
}
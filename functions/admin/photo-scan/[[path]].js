import {currentUser,isOwner} from "../../_lib/access-auth.js";
export async function onRequest(context){
 let user;try{user=await currentUser(context.request,context.env)}catch{}
 const headers={"cache-control":"private, no-store","x-robots-tag":"noindex, nofollow"};
 if(!isOwner(user))return new Response("Not found",{status:404,headers});
 const response=await context.next();
 const h=new Headers(response.headers);for(const [key,value] of Object.entries(headers))h.set(key,value);
 return new Response(response.body,{status:response.status,headers:h});
}
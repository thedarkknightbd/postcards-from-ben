import {currentUser,isOwner} from "../../_lib/access-auth.js";

export async function onRequest(context){
 const {request,env}=context;
 const path=new URL(request.url).pathname;
 // The unified dashboard uses the approved site owner session.
 // Existing Decap CMS and specialized admin endpoints continue to run independently.
 if(path!=="/admin/"&&path!=="/admin"&&path!=="/admin/index.html")return context.next();
 let authorized=false;
 try{authorized=isOwner(await currentUser(request,env))}catch{}
 if(!authorized)return new Response("Not found",{
  status:404,headers:{"cache-control":"private, no-store","x-robots-tag":"noindex, nofollow"}
 });
 const res=await context.next();
 const headers=new Headers(res.headers);
 headers.set("cache-control","private, no-store");
 headers.set("x-robots-tag","noindex, nofollow");
 return new Response(res.body,{status:res.status,headers});
}
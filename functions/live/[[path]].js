import {currentUser,allowed} from "../_lib/access-auth.js";
const notFound=async context=>{const url=new URL("/404.html",context.request.url);const page=await context.env.ASSETS.fetch(new Request(url));return new Response(page.body,{status:404,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-robots-tag":"noindex"}});};
export async function onRequest(context){
 const {request,env}=context;
 if(!env.ACCESS_DB||!env.ACCESS_SESSION_SECRET)return notFound(context);
 const setting=await env.ACCESS_DB.prepare("SELECT live_location_enabled FROM access_privacy WHERE id=1").first();
 if(setting?.live_location_enabled!==1)return notFound(context);
 const user=await currentUser(request,env);
 if(!allowed(user,"location"))return notFound(context);
 const response=await context.next();
 const headers=new Headers(response.headers);headers.set("cache-control","private, no-store");headers.set("x-robots-tag","noindex");
 return new Response(response.body,{status:response.status,headers});
}

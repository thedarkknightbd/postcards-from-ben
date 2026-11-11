import {response,currentUser,allowed} from "../../_lib/access-auth.js";
export async function onRequestGet({request,env}){
 if(!env.ACCESS_DB||!env.ACCESS_SESSION_SECRET||!env.LOCATION_READ_TOKEN)return response({error:"Not found"},404);
 const setting=await env.ACCESS_DB.prepare("SELECT live_location_enabled FROM access_privacy WHERE id=1").first();
 if(setting?.live_location_enabled!==1||!allowed(await currentUser(request,env),"location"))return response({error:"Not found"},404);
 const upstream=await fetch("https://postcards-live-location.bjdominguez.workers.dev/location",{headers:{"accept":"application/json","authorization":"Bearer "+env.LOCATION_READ_TOKEN},cf:{cacheTtl:0}});
 if(!upstream.ok)return response({error:"Location unavailable"},502);
 const body=await upstream.text();
 return new Response(body,{status:200,headers:{"content-type":"application/json; charset=utf-8","cache-control":"private, no-store","x-content-type-options":"nosniff"}});
}

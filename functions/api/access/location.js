import {response,currentUser,allowed,isOwner} from "../../_lib/access-auth.js";
// This proxy is not a replacement for protecting the upstream Worker.
// Deploy only after the Worker rejects unauthenticated GET /location requests.
export async function onRequestGet({request,env}) {
  if(!env.ACCESS_DB||!env.ACCESS_SESSION_SECRET||!env.LOCATION_READ_TOKEN)return response({error:"Not found"},404);
  let user,privacy;
  try {
    user=await currentUser(request,env);
    privacy=await env.ACCESS_DB.prepare("SELECT live_location_enabled FROM access_privacy WHERE id=1").first();
  } catch {return response({error:"Not found"},404);}
  if(privacy?.live_location_enabled!==1||(!isOwner(user)&&!allowed(user,"location")))return response({error:"Not found"},404);
  let upstream;
  try {upstream=await fetch("https://postcards-live-location.bjdominguez.workers.dev/location",{headers:{"accept":"application/json","authorization":"Bearer "+env.LOCATION_READ_TOKEN},redirect:"error"});} catch {return response({error:"Location unavailable"},502);}
  if(!upstream.ok)return response({error:"Location unavailable"},502);
  return new Response(upstream.body,{status:200,headers:{"content-type":"application/json; charset=utf-8","cache-control":"private, no-store","x-content-type-options":"nosniff"}});
}

import {response,adminAuthorized} from "../../_lib/access-auth.js";
export async function onRequest({request,env}){
 if(!env.ACCESS_DB)return response({error:"Not configured"},503);
 if(!await adminAuthorized(request,env))return response({error:"Unauthorized"},401);
 if(request.method==="GET"){
  const settings=await env.ACCESS_DB.prepare("SELECT live_location_enabled FROM access_privacy WHERE id=1").first();
  return response({share_location:settings?.live_location_enabled===1});
 }
 if(request.method!=="POST")return response({error:"Method not allowed"},405);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return response({error:"Invalid origin"},403);
 let body;try{body=await request.json()}catch{return response({error:"Invalid request"},400)}
 if(typeof body.share_location!=="boolean")return response({error:"Expected share_location boolean"},400);
 await env.ACCESS_DB.prepare("UPDATE access_privacy SET live_location_enabled=?,live_location_expires_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=1").bind(Number(body.share_location)).run();
 await env.ACCESS_DB.prepare("INSERT INTO access_audit(id,action,detail) VALUES(?,?,?)").bind(crypto.randomUUID(),"location_sharing_change",JSON.stringify({share_location:body.share_location})).run();
 return response({ok:true,share_location:body.share_location});
}

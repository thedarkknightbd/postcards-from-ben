import {response} from "../../_lib/access-auth.js";
function owner(request,env){return Boolean(env.ACCESS_ADMIN_TOKEN&&request.headers.get("authorization")==="Bearer "+env.ACCESS_ADMIN_TOKEN);}
export async function onRequest({request,env}){
 if(!env.ACCESS_DB)return response({error:"Not configured"},503);
 if(!owner(request,env))return response({error:"Unauthorized"},401);
 if(request.method==="GET"){const settings=await env.ACCESS_DB.prepare("SELECT live_location_enabled,history_enabled,live_location_expires_at FROM access_privacy WHERE id=1").first();return response({settings});}
 if(request.method!=="POST")return response({error:"Method not allowed"},405);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return response({error:"Invalid origin"},403);
 let body;try{body=await request.json()}catch{return response({error:"Invalid request"},400)}
 if(typeof body.live_location_enabled!=="boolean"||typeof body.history_enabled!=="boolean")return response({error:"Invalid settings"},400);
 // Live sharing always expires; owner must renew it.
 const until=body.live_location_enabled?new Date(Date.now()+Math.min(24,Math.max(1,Number(body.hours)||8))*3600000).toISOString():null;
 await env.ACCESS_DB.prepare("UPDATE access_privacy SET live_location_enabled=?,history_enabled=?,live_location_expires_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=1").bind(Number(body.live_location_enabled),Number(body.history_enabled),until).run();
 await env.ACCESS_DB.prepare("INSERT INTO access_audit(id,action,detail) VALUES(?,?,?)").bind(crypto.randomUUID(),"privacy_change",JSON.stringify({live:body.live_location_enabled,history:body.history_enabled,until})).run();
 return response({ok:true,live_location_expires_at:until});
}

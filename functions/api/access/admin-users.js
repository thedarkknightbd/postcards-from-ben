import {response,adminAuthorized} from "../../_lib/access-auth.js";
export async function onRequest({request,env}){
 if(!env.ACCESS_DB)return response({error:"Not configured"},503);
 if(!await adminAuthorized(request,env))return response({error:"Unauthorized"},401);
 if(request.method==="GET"){
  const state=new URL(request.url).searchParams.get("state")||"pending";
  if(!["pending","approved","revoked","all"].includes(state))return response({error:"Invalid filter"},400);
  const rows=await env.ACCESS_DB.prepare("SELECT id,email,display_name,permission,state,created_at,approved_at FROM access_users "+(state==="all"?"":"WHERE state=? ")+"ORDER BY created_at DESC LIMIT 200").bind(...(state==="all"?[]:[state])).all();
  return response({users:rows.results||[]});
 }
 if(request.method!=="POST")return response({error:"Method not allowed"},405);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return response({error:"Invalid origin"},403);
 let body;try{body=await request.json()}catch{return response({error:"Invalid request"},400)}
 const id=String(body.id||""),permission=String(body.permission||""),state=String(body.state||"");
 if(!/^[0-9a-f-]{36}$/.test(id)||!["public","location","private"].includes(permission)||!["approved","revoked"].includes(state))return response({error:"Invalid update"},400);
 const target=await env.ACCESS_DB.prepare("SELECT email FROM access_users WHERE id=?").bind(id).first();
 if(target?.email==="bjdominguez@me.com")return response({error:"Owner access cannot be changed here"},403);
 const result=await env.ACCESS_DB.prepare("UPDATE access_users SET permission=?,state=?,approved_at=CASE WHEN ?='approved' THEN COALESCE(approved_at,CURRENT_TIMESTAMP) ELSE approved_at END,revoked_at=CASE WHEN ?='revoked' THEN CURRENT_TIMESTAMP ELSE NULL END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(permission,state,state,state,id).run();
 if(!result.meta?.changes)return response({error:"Account not found"},404);
 await env.ACCESS_DB.prepare("INSERT INTO access_audit(id,action,subject_id,detail) VALUES(?,?,?,?)").bind(crypto.randomUUID(),"permission_change",id,JSON.stringify({permission,state})).run();
 return response({ok:true});
}

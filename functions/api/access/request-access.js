import {response,normalizeEmail,validEmail} from "../../_lib/access-auth.js";
export async function onRequestPost({request,env}){
 if(!env.ACCESS_DB)return response({error:"Access requests unavailable"},503);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return response({error:"Invalid origin"},403);
 let body;try{body=await request.json()}catch{return response({error:"Invalid request"},400)}
 const email=normalizeEmail(body.email),name=String(body.name||"").trim().slice(0,100);
 if(!validEmail(email)||name.length<1)return response({error:"Name and valid email required"},400);
 // Never reveal whether an account already exists.
 await env.ACCESS_DB.prepare("INSERT OR IGNORE INTO access_users(id,email,display_name,state,permission) VALUES(?,?,?,'pending','public')").bind(crypto.randomUUID(),email,name).run();
 return response({ok:true,message:"Your request has been received. If approved, you can sign in using your email."});
}

import {response,readCookie,digest,cookie} from "../../_lib/access-auth.js";
export async function onRequestPost({request,env}){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return response({error:"Invalid origin"},403);
 const token=readCookie(request,"pbf_session");
 if(token&&env.ACCESS_DB&&env.ACCESS_SESSION_SECRET){const hash=await digest(token,env.ACCESS_SESSION_SECRET);await env.ACCESS_DB.prepare("UPDATE access_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=?").bind(hash).run();}
 return response({ok:true},200,{"set-cookie":cookie("pbf_session","",0)});
}

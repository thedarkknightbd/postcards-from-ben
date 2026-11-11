import {response,digest,randomToken,cookie,isoAfter,normalizeEmail,validEmail} from "../../_lib/access-auth.js";
export async function onRequestPost({request,env}){
 if(!env.ACCESS_DB||!env.ACCESS_SESSION_SECRET)return response({error:"Sign-in is not configured"},503);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return response({error:"Invalid origin"},403);
 let body;try{body=await request.json()}catch{return response({error:"Invalid request"},400)}
 const email=normalizeEmail(body.email),code=String(body.code||""),id=String(body.challenge_id||"");
 if(!validEmail(email)||!/^[0-9]{6}$/.test(code)||!/^[0-9a-f-]{36}$/.test(id))return response({error:"Invalid code"},400);
 const challenge=await env.ACCESS_DB.prepare(`SELECT c.id,c.code_hash,c.attempts,c.expires_at,c.consumed_at,c.user_id,u.permission FROM access_email_challenges c JOIN access_users u ON u.id=c.user_id WHERE c.id=? AND u.email=? AND u.state='approved'`).bind(id,email).first();
 if(!challenge||challenge.consumed_at||challenge.attempts>=5||Date.parse(challenge.expires_at)<=Date.now())return response({error:"Code expired or invalid"},401);
 // Increment attempts atomically before validating the code, so parallel requests cannot bypass limits.
 const bump=await env.ACCESS_DB.prepare("UPDATE access_email_challenges SET attempts=attempts+1 WHERE id=? AND consumed_at IS NULL AND attempts<5 AND expires_at>CURRENT_TIMESTAMP").bind(id).run();
 if(!bump.meta?.changes)return response({error:"Code expired or invalid"},401);
 const hash=await digest(id+":"+code,env.ACCESS_SESSION_SECRET);
 if(hash!==challenge.code_hash)return response({error:"Incorrect code"},401);
 const consume=await env.ACCESS_DB.prepare("UPDATE access_email_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE id=? AND consumed_at IS NULL").bind(id).run();
 if(!consume.meta?.changes)return response({error:"Code already used"},401);
 const token=randomToken(),tokenHash=await digest(token,env.ACCESS_SESSION_SECRET);
 await env.ACCESS_DB.prepare("INSERT INTO access_sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)").bind(crypto.randomUUID(),challenge.user_id,tokenHash,isoAfter(30*86400*1000)).run();
 return response({ok:true},200,{"set-cookie":cookie("pbf_session",token,30*86400)});
}

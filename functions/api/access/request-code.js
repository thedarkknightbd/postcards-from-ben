import {response,digest,isoAfter,randomToken,normalizeEmail,validEmail} from "../../_lib/access-auth.js";
const generic={ok:true,message:"If the address is eligible, a verification code will arrive shortly."};
export async function onRequestPost({request,env}){
 if(!env.ACCESS_DB||!env.ACCESS_SESSION_SECRET||!env.RESEND_API_KEY||!env.ACCESS_EMAIL_FROM)return response({error:"Sign-in is not configured"},503);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return response({error:"Invalid origin"},403);
 let body;try{body=await request.json()}catch{return response({error:"Invalid request"},400)}
 const email=normalizeEmail(body.email);if(!validEmail(email))return response({error:"Enter a valid email"},400);
 // Only pre-approved accounts may receive a sign-in code. Requests for approval use a separate flow.
 const user=await env.ACCESS_DB.prepare("SELECT id,state FROM access_users WHERE email=?").bind(email).first();
 if(!user||user.state!=="approved")return response(generic);
 const recent=await env.ACCESS_DB.prepare("SELECT COUNT(*) AS n FROM access_email_challenges WHERE user_id=? AND created_at>datetime('now','-15 minutes')").bind(user.id).first();
 if((recent?.n||0)>=3)return response(generic);
 const bytes=crypto.getRandomValues(new Uint32Array(1));const code=String(bytes[0]%1000000).padStart(6,"0");
 const challengeId=crypto.randomUUID(),hash=await digest(challengeId+":"+code,env.ACCESS_SESSION_SECRET);
 await env.ACCESS_DB.prepare("INSERT INTO access_email_challenges(id,user_id,code_hash,expires_at) VALUES(?,?,?,?)").bind(challengeId,user.id,hash,isoAfter(10*60*1000)).run();
 const emailResult=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"authorization":"Bearer "+env.RESEND_API_KEY,"content-type":"application/json"},body:JSON.stringify({from:env.ACCESS_EMAIL_FROM,to:[email],subject:"Your Postcards from Ben sign-in code",text:"Your sign-in code is "+code+". It expires in 10 minutes. If you didn't request this, ignore this email."})});
 if(!emailResult.ok)return response({error:"Unable to send code. Try again later."},503);
 return response({...generic,challenge_id:challengeId});
}

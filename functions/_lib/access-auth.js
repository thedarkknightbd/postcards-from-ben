// Development-only authentication helpers. Requires ACCESS_DB and ACCESS_SESSION_SECRET.
export const response=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...headers}});
const enc=new TextEncoder();
export async function digest(value,secret){const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const sig=await crypto.subtle.sign("HMAC",key,enc.encode(value));return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("");}
export const isoAfter=ms=>new Date(Date.now()+ms).toISOString();
export const randomToken=()=>{const bytes=crypto.getRandomValues(new Uint8Array(32));return [...bytes].map(x=>x.toString(16).padStart(2,"0")).join("");};
export const validEmail=e=>typeof e==="string"&&e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const normalizeEmail=e=>String(e||"").trim().toLowerCase();
export const cookie=(name,token,maxAge)=>`${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
export function readCookie(request,name){const parts=(request.headers.get("cookie")||"").split(";");for(const p of parts){const [k,...v]=p.trim().split("=");if(k===name)return decodeURIComponent(v.join("="));}return null;}
export async function currentUser(request,env){if(!env.ACCESS_DB||!env.ACCESS_SESSION_SECRET)return null;const token=readCookie(request,"pbf_session");if(!token)return null;const hash=await digest(token,env.ACCESS_SESSION_SECRET);return await env.ACCESS_DB.prepare(`SELECT u.id,u.email,u.display_name,u.permission,u.state FROM access_sessions s JOIN access_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND datetime(s.expires_at)>CURRENT_TIMESTAMP AND u.state='approved'`).bind(hash).first();}
// Private and Location are separate permissions. Public content needs no account.
export const allowed=(user,level)=>Boolean(
 user&&user.state==="approved"&&
 (level==="public"||((level==="private"||level==="location")&&user.permission===level))
);

// Owner identity is fixed server-side; a private membership alone never grants admin rights.
export const isOwner=user=>Boolean(user&&user.state==="approved"&&user.email==="bjdominguez@me.com");
export async function adminAuthorized(request,env){if(isOwner(await currentUser(request,env)))return true;return Boolean(env.ACCESS_ADMIN_TOKEN&&request.headers.get("authorization")==="Bearer "+env.ACCESS_ADMIN_TOKEN);}

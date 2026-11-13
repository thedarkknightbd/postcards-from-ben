// Complete replacement for postcards-live-location — deploy only after D1 setup.
// Bind LOCATION_CONTROL_DB, LOCATION_HISTORY (D1), LIVE_LOCATION (KV).
// Keep LOCATION_READ_TOKEN and OWNTRACKS_PASSWORD secrets unchanged.
export default { async fetch(request,env) {
 const {pathname}=new URL(request.url);
 if(request.method==="OPTIONS"){
  if(request.headers.get("Origin")!=="https://postcardsfromben.com")return new Response(null,{status:403});
  return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":"https://postcardsfromben.com","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Authorization, Content-Type","Cache-Control":"no-store"}});
 }
 if(pathname==="/"&&request.method==="GET")return json({ok:true,service:"Postcards from Ben Live Location"});
 if(pathname==="/control-status"&&request.method==="GET"){
  if(!await bearer(request,env.LOCATION_READ_TOKEN))return json({ok:false,message:"Unauthorized"},401);
  const state=await control(env);
  if(!state.available)return json({ok:false,message:"Control database unavailable"},503);
  return json({ok:true,recording_gate:true,control_store:"D1",recording_enabled:state.enabled});
 }
 if(pathname==="/location"&&request.method==="GET"){
  if(!await bearer(request,env.LOCATION_READ_TOKEN))return json({ok:false,message:"Unauthorized"},401);
  const state=await control(env);
  if(!state.available)return json({ok:false,message:"Control database unavailable"},503);
  if(!state.enabled)return json({ok:false,message:"Location sharing is off"},404);
  let latest;
  try{latest=await env.LIVE_LOCATION.get("latest",{type:"json"})}
  catch(e){console.error("KV read failed",e);return json({ok:false,message:"Location unavailable"},503)}
  if(!latest||!Number.isFinite(Number(latest.timestamp))||
      Number(latest.timestamp)*1000<Date.parse(state.enabledAt))
   return json({ok:false,message:"Waiting for a new position"},404);
  return json({ok:true,latitude:latest.latitude,longitude:latest.longitude,
    accuracy:latest.accuracy,timestamp:latest.timestamp,receivedAt:latest.receivedAt});
 }
 if(pathname==="/owntracks"&&request.method==="POST"){
  if(!basic(request,"owntracks",env.OWNTRACKS_PASSWORD))
   return new Response("Unauthorized",{status:401,headers:{"Cache-Control":"no-store","WWW-Authenticate":'Basic realm="OwnTracks"'}});
  let state=await control(env);
  if(!state.available)return json({ok:false,message:"Control database unavailable"},503);
  if(!state.enabled)return json([]); // acknowledge but do not record
  const raw=await request.text();
  if(raw.length>65536)return json({ok:false,message:"Payload too large"},413);
  if(!raw.trim())return json([]);
  let p;try{p=JSON.parse(raw)}catch{return json({ok:false,message:"Invalid JSON"},400)}
  if(p?._type!=="location")return json([]);
  const lat=Number(p.lat),lon=Number(p.lon),tst=Number(p.tst);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isInteger(tst)||
      tst<=0||lat< -90||lat>90||lon< -180||lon>180)
   return json({ok:false,message:"Invalid location payload"},400);
  if(tst*1000<Date.parse(state.enabledAt))return json([]); // delayed backlog
  const acc=optionalNumber(p.acc),alt=optionalNumber(p.alt),
    vac=optionalNumber(p.vac),vel=optionalNumber(p.vel),receivedAt=new Date().toISOString();
  state=await control(env); // re-check before saving history
  if(!state.available)return json({ok:false,message:"Control database unavailable"},503);
  if(!state.enabled||tst*1000<Date.parse(state.enabledAt))return json([]);
  try{
   await env.LOCATION_HISTORY.prepare(`INSERT OR IGNORE INTO location_history
    (timestamp,latitude,longitude,elevation,accuracy,vertical_accuracy,speed,source,received_at)
    VALUES (?,?,?,?,?,?,?,'owntracks',?)`)
    .bind(tst,lat,lon,alt,acc,vac,vel,receivedAt).run();
  }catch(e){console.error("History write failed",e);return json({ok:false,message:"Historical storage unavailable"},503)}
  state=await control(env); // re-check before saving latest KV
  if(!state.available)return json({ok:false,message:"Control database unavailable"},503);
  if(!state.enabled||tst*1000<Date.parse(state.enabledAt))return json([]);
  try{
   const old=await env.LIVE_LOCATION.get("latest",{type:"json"});
   if(!old||!Number.isFinite(Number(old.timestamp))||tst>=Number(old.timestamp))
    await env.LIVE_LOCATION.put("latest",JSON.stringify({latitude:lat,longitude:lon,timestamp:tst,accuracy:acc,receivedAt}));
  }catch(e){console.error("KV write failed",e);return json({ok:false,message:"Latest storage unavailable"},503)}
  return json([]);
 }
 return json({ok:false,message:"Not found"},404);
}};
async function control(env){
 if(!env.LOCATION_CONTROL_DB)return {available:false,enabled:false};
 try{
  const row=await env.LOCATION_CONTROL_DB.prepare("SELECT enabled,enabled_at FROM location_control WHERE id=1").first();
  if(!row)return {available:false,enabled:false};
  return {available:true,enabled:row.enabled===1&&Number.isFinite(Date.parse(row.enabled_at||"")),enabledAt:row.enabled_at};
 }catch(e){console.error("Master state failed",e);return {available:false,enabled:false}}
}
function optionalNumber(v){if(v===undefined||v===null||v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null}
function basic(req,name,password){
 if(typeof password!=="string"||!password)return false;
 const h=req.headers.get("Authorization");if(!h||!h.startsWith("Basic "))return false;
 try{const d=atob(h.slice(6)),i=d.indexOf(":");return i>=0&&d.slice(0,i)===name&&d.slice(i+1)===password}catch{return false}
}
async function bearer(req,token){
 const h=req.headers.get("Authorization");if(!h||!h.startsWith("Bearer ")||typeof token!=="string"||!token)return false;
 const enc=new TextEncoder();
 const a=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(h.slice(7))));
 const b=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(token)));
 let difference=0;for(let i=0;i<b.length;i++)difference|=a[i]^b[i];return difference===0;
}
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}

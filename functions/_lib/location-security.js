// Private location security helpers. Never expose the upstream Worker URL or token to browsers.
export const LOCATION_CONFIG_KEY="internal/location-sharing-v1.json";
export async function locationSharingState(env){
 if(!env.LOCATION_CONTROL_DB)return {sharing:false,available:false,enabled_at:null};
 try{const state=await env.LOCATION_CONTROL_DB.prepare("SELECT enabled,enabled_at FROM location_control WHERE id=1").first();
 return {sharing:state?.enabled===1,available:!!state,enabled_at:state?.enabled_at||null}
 }catch{return {sharing:false,available:false,enabled_at:null}}
}
const LOCATION_URL="https://postcards-live-location.bjdominguez.workers.dev/location";
const SERVICE_REQUEST_URL="https://location-worker.internal/location";
export const locationTransport=env=>env.LOCATION_WORKER&&typeof env.LOCATION_WORKER.fetch==="function"?"service_binding":"public_url";
export function upstreamConfigured(env){
 return Boolean(env.LOCATION_READ_TOKEN);
}
export async function requestLocationWorker(env,authenticated=false,path="/location"){
 const service=locationTransport(env)==="service_binding";
 const url=(service?SERVICE_REQUEST_URL:LOCATION_URL).replace(/\/location$/,path);
 const headers={"accept":"application/json"};
 if(authenticated)headers.authorization="Bearer "+env.LOCATION_READ_TOKEN;
 const request=new Request(url,{method:"GET",headers,redirect:"manual",signal:AbortSignal.timeout(6000)});
 const response=service?await env.LOCATION_WORKER.fetch(request):await fetch(request,{cache:"no-store"});
 // Never follow an upstream redirect, especially when credentials are attached.
 if(response.status>=300&&response.status<400)throw Error("Location Worker redirect refused");
 return response;
}
export function workerVerified(env){
 return upstreamConfigured(env)&&locationTransport(env)==="service_binding"&&Boolean(env.LOCATION_CONTROL_DB);
}
export async function recordingGateReady(env){
 if(!workerVerified(env))return false;
 try{
  const anonymous=await requestLocationWorker(env,false,"/control-status");
  if(![401,403,404].includes(anonymous.status))return false;
  const authenticated=await requestLocationWorker(env,true,"/control-status");
  if(!authenticated.ok||!String(authenticated.headers.get("content-type")||"").includes("application/json"))return false;
  const body=await authenticated.text();if(body.length>2048)return false;
  const data=JSON.parse(body);
  return data.recording_gate===true&&data.control_store==="D1";
 }catch{return false}
}
export function sanitizeLocation(data){
 if(!data||typeof data!=="object")return null;
 // Permit common OwnTracks envelope structures while returning a strict whitelist.
 const candidate=[data,data.location,data.latest,data.data,data.result].find(entry=>
  entry&&typeof entry==="object"&&
  Number.isFinite(Number(entry.lat??entry.latitude))&&
  Number.isFinite(Number(entry.lon??entry.longitude)));
 if(!candidate)return null;
 const lat=Number(candidate.lat??candidate.latitude),lon=Number(candidate.lon??candidate.longitude);
 if(Math.abs(lat)>90||Math.abs(lon)>180)return null;
 const timestamp=Number(candidate.tst??candidate.timestamp);
 const point={latitude:lat,longitude:lon};
 if(Number.isFinite(timestamp)&&timestamp>0)point.timestamp=timestamp;
 for(const [field,names,min,max] of [
  ["accuracy_m",["acc","accuracy"],0,100000],
  ["altitude_m",["alt","altitude"],-1000,12000],
  ["battery_percent",["batt","battery"],0,100]]) {
  const raw=names.map(k=>candidate[k]).find(v=>v!==undefined&&v!==null);
  if(raw!==undefined){const n=Number(raw);if(Number.isFinite(n)&&n>=min&&n<=max)point[field]=n}
 }
 return point;
}
export async function readProtectedWorker(env){
 if(!workerVerified(env))return {ok:false,error:"Worker integration is not verified"};
 try{
  const denied=await requestLocationWorker(env,false);
  if(![401,403,404].includes(denied.status))return {ok:false,error:"Worker allows unauthenticated access or returned an unexpected status"};
  const res=await requestLocationWorker(env,true);
  if(!res.ok)return {ok:false,error:"Protected Worker did not provide location",status:res.status};
  if(!String(res.headers.get("content-type")||"").toLowerCase().includes("application/json"))
   return {ok:false,error:"Worker returned an unexpected content type"};
  const body=await res.text();
  if(body.length>12000)return {ok:false,error:"Worker response exceeds limit"};
  const location=sanitizeLocation(JSON.parse(body));
  if(!location)return {ok:false,error:"Worker returned no valid coordinates"};
  return {ok:true,location};
 }catch{return {ok:false,error:"Protected Worker connection failed"}}
}

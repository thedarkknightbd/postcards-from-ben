// Private location security helpers. Never expose the upstream Worker URL or token to browsers.
export const LOCATION_CONFIG_KEY="internal/location-sharing-v1.json";
export async function locationSharingState(env){
 if(!env.PRIVATE_MEDIA)return {sharing:false,available:false};
 try{
  const object=await env.PRIVATE_MEDIA.get(LOCATION_CONFIG_KEY);
  if(!object)return {sharing:false,available:true};
  const state=await object.json();
  return {sharing:state?.sharing===true,available:true,updated_at:state?.updated_at||null};
 }catch{return {sharing:false,available:false}}
}
export function upstreamConfigured(env){
 try{
  const url=new URL(env.LOCATION_WORKER_READ_URL||"");
  return url.protocol==="https:"&&url.username===""&&url.password===""&&
   !url.search&&!url.hash&&url.hostname!=="postcardsfromben.com"&&
   Boolean(env.LOCATION_WORKER_READ_TOKEN);
 }catch{return false}
}
export function workerVerified(env){
 // Set only after the separate Worker is audited for protected GET, preserved
 // OwnTracks ingestion, and its production routes are tested.
 return upstreamConfigured(env)&&env.LOCATION_WORKER_VERIFIED==="true";
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
  const res=await fetch(env.LOCATION_WORKER_READ_URL,{
   method:"GET",
   headers:{"authorization":"Bearer "+env.LOCATION_WORKER_READ_TOKEN,"accept":"application/json"},
   redirect:"error",cache:"no-store",signal:AbortSignal.timeout(6000)
  });
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

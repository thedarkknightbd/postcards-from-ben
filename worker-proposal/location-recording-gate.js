// Proposed Cloudflare Worker recording gate. Not active until integrated into
// postcards-live-location's actual /owntracks handler and sharing-state storage.
// Requires a dedicated KV binding LOCATION_CONTROL shared with the Pages project.
// Does not touch LIVE_LOCATION KV, LOCATION_HISTORY D1, or OwnTracks credentials.
export const SWITCH_KEY="master-switch-v1";

export async function shouldRecordLocation(env,pointTimestampSeconds){
 if(!env.LOCATION_CONTROL)return {record:false,reason:"control_unconfigured"};
 let state;
 try{state=await env.LOCATION_CONTROL.get(SWITCH_KEY,"json")}
 catch{return {record:false,reason:"control_unavailable"}}
 if(state?.enabled!==true)return {record:false,reason:"recording_disabled"};
 const enabledAt=Date.parse(state.enabledAt||"");
 // Prevent accepting buffered OwnTracks locations that were generated
 // while recording was disabled. If the timestamp is absent, fail closed.
 const recordedAt=Number(pointTimestampSeconds);
 if(!Number.isFinite(enabledAt)||!Number.isFinite(recordedAt)||recordedAt<=0)
  return {record:false,reason:"timestamp_unavailable"};
 if(recordedAt*1000<enabledAt)return {record:false,reason:"older_than_enable_time"};
 return {record:true,reason:"enabled"};
}

// Proposed Cloudflare Worker recording gate. Not active until integrated into
// postcards-live-location's actual /owntracks handler and sharing-state storage.
// Requires a dedicated D1 binding LOCATION_CONTROL_DB shared with the Pages project.
// Does not touch LIVE_LOCATION KV, LOCATION_HISTORY D1, or OwnTracks credentials.
// D1 schema: location_control(id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL, enabled_at TEXT)


export async function shouldRecordLocation(env,pointTimestampSeconds){
 if(!env.LOCATION_CONTROL_DB)return {record:false,reason:"control_unconfigured"};
 let state;
 try{state=await env.LOCATION_CONTROL_DB.prepare("SELECT enabled,enabled_at FROM location_control WHERE id=1").first()}
 catch{return {record:false,reason:"control_unavailable"}}
 if(state?.enabled!==1)return {record:false,reason:"recording_disabled"};
 const enabledAt=Date.parse(state.enabled_at||"");
 // Prevent accepting buffered OwnTracks locations that were generated
 // while recording was disabled. If the timestamp is absent, fail closed.
 const recordedAt=Number(pointTimestampSeconds);
 if(!Number.isFinite(enabledAt)||!Number.isFinite(recordedAt)||recordedAt<=0)
  return {record:false,reason:"timestamp_unavailable"};
 if(recordedAt*1000<enabledAt)return {record:false,reason:"older_than_enable_time"};
 return {record:true,reason:"enabled"};
}

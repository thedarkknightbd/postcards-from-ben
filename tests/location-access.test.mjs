import test from "node:test";
import assert from "node:assert/strict";
import {onRequest as locationPage} from "../functions/location/[[path]].js";
import {onRequestGet as live} from "../functions/api/location-live.js";
import {onRequest as sharing} from "../functions/api/location-sharing.js";
import {onRequestGet as me} from "../functions/api/access/me.js";
import {digest} from "../functions/_lib/access-auth.js";

// Source-backed authorization tests. These use synthetic identities and
// intentionally provide no real Location Worker or personal location history.
const token="synthetic-session-only";
const secret="test-session-secret";
const origin="https://postcardsfromben.com";
const users={
 owner:{id:"1",email:"bjdominguez@me.com",permission:"private",state:"approved"},
 location:{id:"2",email:"location-member@example.invalid",permission:"location",state:"approved"},
 private:{id:"3",email:"private-member@example.invalid",permission:"private",state:"approved"},
 revoked:{id:"4",email:"revoked@example.invalid",permission:"location",state:"revoked"}
};
const hash=await digest(token,secret);
function environment(member){
 return {
  ACCESS_SESSION_SECRET:secret,
  ACCESS_DB:{prepare:()=>({bind:actual=>({first:async()=>actual===hash&&member?.state==="approved"?member:null})})}
  // No location database or Worker: sharing must fail closed.
 };
}
function request(path,member,method="GET",body){
 return new Request(origin+path,{method,headers:{
  ...(member?{cookie:"pbf_session="+token}:{}),
  ...(body?{origin,"content-type":"application/json"}:{})
 },...(body?{body:JSON.stringify(body)}:{})});
}
for(const [role,user] of Object.entries({anonymous:null,...users})){
 test(role+" location page and location API permissions",async()=>{
  const env=environment(user);
  const page=await locationPage({request:request("/location/",user),env,next:async()=>new Response("Private page")});
  const liveResult=await live({request:request("/api/location-live",user),env});
  const status=await sharing({request:request("/api/location-sharing",user),env});
  const identity=await me({request:request("/api/access/me",user),env});
  const account=await identity.json();
  const authorized=role==="owner"||role==="location";
  assert.equal(page.status,authorized?200:404);
  assert.equal(status.status,authorized?200:404);
  assert.equal(liveResult.status,authorized?403:404);
  assert.equal(account.can_view_location,authorized);
  assert.equal((await liveResult.text()).includes("latitude"),false);
  assert.equal(page.headers.get("cache-control")?.includes("no-store"),true);
 });
}
test("Location membership cannot turn on sharing",async()=>{
 for(const role of ["location","private","revoked","anonymous"]){
  const user=users[role]||null;
  const response=await sharing({request:request("/api/location-sharing",user,"POST",{sharing:true}),env:environment(user)});
  assert.equal(response.status,404,role);
 }
});
test("Owner cannot enable location without a verified control database",async()=>{
 const response=await sharing({request:request("/api/location-sharing",users.owner,"POST",{sharing:true}),env:environment(users.owner)});
 assert.equal(response.status,503);
});

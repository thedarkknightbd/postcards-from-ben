// Single allowlisted GitHub integration for private admin postcard publishing.
// Never send env.GITHUB_PUBLISH_TOKEN to the browser.
const REPO="thedarkknightbd/postcards-from-ben";
const OTHER_TRIPS=new Set(["winter-on-the-black-sea","autumn-in-hungary","a-special-convention","under-the-mara-sky","an-afternoon-with-giants"]);
export function targetFromRequest(request){
 const url=new URL(request.url);
 const trip=url.searchParams.get("trip");
 const day=url.searchParams.get("day");
 if(trip==="the-long-way-around"&&/^(?:0[1-9]|1[0-9]|2[0-4])$/.test(day||""))
  return {path:"trips/the-long-way-around/data/day-"+day+".json",draftKey:"internal/cms-drafts/long-way-around/day-"+day+".json",title:"Day "+day};
 if(OTHER_TRIPS.has(trip)&&day===null)
  return {path:"trips/"+trip+"/postcard.json",draftKey:"internal/cms-drafts/past-adventures/"+trip+".json",title:trip.replace(/-/g," ")};
 return null;
}
function decodeB64(content){
 const clean=String(content||"").replace(/\s/g,"");
 const bytes=Uint8Array.from(atob(clean),ch=>ch.charCodeAt(0));
 return new TextDecoder().decode(bytes);
}
function encodeB64(str){
 const bytes=new TextEncoder().encode(str);let binary="";
 for(let i=0;i<bytes.length;i+=8192)
  binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
export const validSha=sha=>typeof sha==="string"&&/^[a-f0-9]{40}$/.test(sha);
const githubHeaders=env=>({
 "accept":"application/vnd.github+json",
 "x-github-api-version":"2022-11-28",
 "user-agent":"postcards-from-ben-private-cms",
 ...(env.GITHUB_PUBLISH_TOKEN?{"authorization":"Bearer "+env.GITHUB_PUBLISH_TOKEN}:{})
});
export async function readGithub(env,path){
 const uri="https://api.github.com/repos/"+REPO+"/contents/"+path+"?ref=main";
 let reply;
 try{reply=await fetch(uri,{headers:githubHeaders(env),cache:"no-store"})}
 catch{throw {status:503,detail:"GitHub is unreachable"}}
 if(!reply.ok)throw {status:reply.status===404?404:503,detail:"Unable to verify GitHub source ("+reply.status+")"};
 let file;try{file=await reply.json()}catch{throw {status:503,detail:"Invalid GitHub response"}}
 if(file.type!=="file"||!validSha(file.sha)||file.encoding!=="base64"||typeof file.content!=="string")
  throw {status:503,detail:"Unexpected GitHub file data"};
 let entry;try{entry=JSON.parse(decodeB64(file.content))}catch{throw {status:503,detail:"Invalid source JSON"}}
 return {sha:file.sha,entry,path};
}
export async function writeGithub(env,path,sha,entry,message){
 const uri="https://api.github.com/repos/"+REPO+"/contents/"+path;
 let reply;
 try{
  reply=await fetch(uri,{
   method:"PUT",
   headers:{...githubHeaders(env),"content-type":"application/json"},
   body:JSON.stringify({message,content:encodeB64(JSON.stringify(entry,null,2)+"\n"),sha,branch:"main"})
  });
 }catch{throw {status:503,detail:"GitHub publish request failed"}}
 if(reply.status===409||reply.status===422)
  throw {status:409,detail:"GitHub rejected the update: the file may have changed. Reload and compare before publishing."};
 if(!reply.ok)throw {status:503,detail:"GitHub publish failed (HTTP "+reply.status+"). Check the token's repository Contents permission."};
 let result;try{result=await reply.json()}catch{throw {status:503,detail:"GitHub publish response was incomplete"}}
 if(!validSha(result?.content?.sha)||!validSha(result?.commit?.sha))
  throw {status:503,detail:"GitHub did not return a verifiable commit"};
 return {commit_sha:result.commit.sha,file_sha:result.content.sha,commit_url:"https://github.com/"+REPO+"/commit/"+result.commit.sha};
}

import {currentUser,isOwner,response} from "../../_lib/access-auth.js";
import {readGithub,writeGithub,validSha} from "../../_lib/postcard-github.js";
const MAP={"adventure-status":["data/home-adventure.json","internal/cms-drafts/homepage/adventure-status.json"],"where-to-next":["data/where-to-next.json","internal/cms-drafts/homepage/where-to-next.json"]};
const error=(detail,status)=>response({error:detail},status);
const isText=(v,n)=>typeof v==="string"&&v.length<=n;
const isPath=(v)=>isText(v,500)&&(!v||(v.startsWith("/")&&!v.startsWith("//")&&!v.includes("\\")));
function valid(v,kind){
 if(!v||typeof v!=="object"||Array.isArray(v))return false;
 let serialized;try{serialized=JSON.stringify(v)}catch{return false}
 if(serialized.length>50000||serialized.includes('"__proto__"')||serialized.includes('"constructor"')||serialized.includes('"prototype"'))return false;
 if(kind==="adventure-status"){
  if(!["between","traveling","upcoming"].includes(v.status))return false;
  return ["currentAdventure","upcomingAdventure"].every(k=>v[k]&&typeof v[k]==="object"&&isText(v[k].title,200)&&isText(v[k].description,2500)&&isPath(v[k].url));
 }
 return isText(v.intro,4000)&&Array.isArray(v.ideas)&&v.ideas.length<=15&&v.ideas.every(x=>x&&typeof x==="object"&&isText(x.title,160)&&x.title.trim()&&["dreaming","planning","upcoming"].includes(x.stage)&&isText(x.description,3000)&&isPath(x.image)&&isPath(x.url));
}
export async function onRequest({request,env}){
 let user=null;try{user=await currentUser(request,env)}catch{}
 if(!isOwner(user))return error("Not found",404);
 const section=new URL(request.url).searchParams.get("section"),mapping=MAP[section];
 if(!mapping)return error("Unknown homepage section",400);
 if(!env.PRIVATE_MEDIA)return error("Private draft storage unavailable",503);
 const [path,key]=mapping;
 const loadDraft=async()=>{const obj=await env.PRIVATE_MEDIA.get(key);return obj?await obj.json():null};
 if(request.method==="GET"){
  let draft;try{draft=await loadDraft()}catch{return error("Cannot read private draft",503)}
  try{const source=await readGithub(env,path);return response({draft,source:{sha:source.sha,entry:source.entry},configured:!!env.GITHUB_PUBLISH_TOKEN})}
  catch(e){return response({draft,source:null,source_error:e.detail||"GitHub source unavailable",configured:!!env.GITHUB_PUBLISH_TOKEN})}
 }
 if(request.method!=="POST"&&request.method!=="DELETE")return error("Method not allowed",405);
 if(request.headers.get("origin")!==new URL(request.url).origin)return error("Invalid origin",403);
 if(request.method==="DELETE"){
  try{await env.PRIVATE_MEDIA.delete(key);return response({ok:true})}catch{return error("Could not discard draft",503)}
 }
 if(Number(request.headers.get("content-length")||0)>60000)return error("Request too large",413);
 let body;try{body=await request.json()}catch{return error("Invalid JSON",400)}
 if(body?.action==="save"){
  if(!valid(body.entry,section))return error("Invalid homepage content",400);
  let old;try{old=await loadDraft()}catch{return error("Cannot read previous draft",503)}
  let base=old?.base_sha;
  if(!validSha(base)){
   if(!validSha(body.base_sha))return error("Reload published content before saving a draft",409);
   let source;try{source=await readGithub(env,path)}catch(e){return error(e.detail||"GitHub unavailable",e.status||503)}
   if(source.sha!==body.base_sha)return error("Published content changed. Reload first.",409);
   base=source.sha;
  }
  const draft={entry:body.entry,base_sha:base,status:"draft",saved_at:new Date().toISOString()};
  try{await env.PRIVATE_MEDIA.put(key,JSON.stringify(draft),{httpMetadata:{contentType:"application/json",cacheControl:"private, no-store"}});return response({ok:true,base_sha:base,saved_at:draft.saved_at})}
  catch{return error("Could not save draft",503)}
 }
 if(body?.action!=="publish")return error("Unknown action",400);
 if(new URL(request.url).hostname!=="postcardsfromben.com")return error("Publishing is available only on the production site",403);
 if(!env.GITHUB_PUBLISH_TOKEN)return error("GitHub publisher is not configured",503);
 if(body.confirmation!=="PUBLISH"||!validSha(body.source_sha))return error("Review preview and confirm the current source version",400);
 let draft;try{draft=await loadDraft()}catch{return error("Cannot load saved draft",503)}
 if(!draft||draft.status!=="draft"||!valid(draft.entry,section)||!validSha(draft.base_sha)||draft.base_sha!==body.source_sha)return error("Saved draft is missing or its source version does not match",409);
 let source;try{source=await readGithub(env,path)}catch(e){return error(e.detail||"Could not verify GitHub",e.status||503)}
 if(source.sha!==draft.base_sha)return error("Published content changed. No overwrite performed.",409);
 if(JSON.stringify(source.entry)===JSON.stringify(draft.entry))return error("Nothing has changed",409);
 let update;try{update=await writeGithub(env,path,source.sha,draft.entry,"Update homepage: "+section)}
 catch(e){return error(e.detail||"Publish failed",e.status||503)}
 try{await env.PRIVATE_MEDIA.put(key,JSON.stringify({...draft,base_sha:update.file_sha,status:"published_pending_deploy",published_commit:update.commit_sha,published_at:new Date().toISOString()}),{httpMetadata:{contentType:"application/json",cacheControl:"private, no-store"}})}catch{}
 return response({ok:true,commit_sha:update.commit_sha,commit_url:update.commit_url,message:"Committed to GitHub; Cloudflare deployment may still be pending"});
}

import {currentUser,isOwner,response} from "../../_lib/access-auth.js";
import {targetFromRequest,readGithub,writeGithub,validSha} from "../../_lib/postcard-github.js";

const hidden=()=>response({error:"Not found"},404);
function safeEntry(value){
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 function walk(x,depth=0){
  if(depth>12)return false;
  if(x===null||typeof x!=="object")return true;
  return Object.keys(x).every(k=>!["__proto__","constructor","prototype"].includes(k)&&walk(x[k],depth+1));
 }
 try{return walk(value)&&JSON.stringify(value).length<75000}catch{return false}
}
export async function onRequest({request,env}){
 let user=null;try{user=await currentUser(request,env)}catch{}
 if(!isOwner(user))return hidden();
 const target=targetFromRequest(request);
 if(!target)return response({error:"Unknown postcard"},400);
 if(!env.PRIVATE_MEDIA)return response({error:"Private draft storage is unavailable"},503);
 if(request.method==="GET"){
  try{
   const source=await readGithub(env,target.path);
   return response({source_sha:source.sha,source_entry:source.entry,configured:Boolean(env.GITHUB_PUBLISH_TOKEN),
    production_only:true,source_path:target.path,ready_to_publish:Boolean(env.GITHUB_PUBLISH_TOKEN)});
  }catch(e){return response({error:e.detail||"GitHub source unavailable"},e.status||503)}
 }
 if(request.method!=="POST")return response({error:"Method not allowed"},405);
 // Publishing never runs from preview deployment or a separate host.
 if(new URL(request.url).hostname!=="postcardsfromben.com")return response({error:"Publishing is only allowed on the primary production website"},403);
 if(request.headers.get("origin")!==new URL(request.url).origin)return response({error:"Invalid origin"},403);
 if(Number(request.headers.get("content-length")||0)>2048)return response({error:"Invalid publish request"},413);
 if(!env.GITHUB_PUBLISH_TOKEN)return response({error:"GitHub publishing is not configured. Add GITHUB_PUBLISH_TOKEN as a production Cloudflare Pages secret."},503);
 let payload;try{payload=await request.json()}catch{return response({error:"Invalid JSON"},400)}
 if(payload?.confirmation!=="PUBLISH"||!validSha(payload?.source_sha))
  return response({error:"Review the preview and confirm the current source version before publishing"},400);
 let draft;
 try{const obj=await env.PRIVATE_MEDIA.get(target.draftKey);draft=obj?await obj.json():null}
 catch{return response({error:"Cannot read saved draft"},503)}
 if(!safeEntry(draft?.entry))return response({error:"Save a valid private draft first"},409);
 if(!validSha(draft.base_sha)||draft.base_sha!==payload.source_sha)
  return response({error:"Draft baseline is missing or differs from preview. Reload and compare the published version before publishing."},409);
 if(target.path.includes("/data/day-")){
  const n=Number(target.path.match(/day-(\d\d)\.json$/)?.[1]);
  if(draft.entry.dayNumber!==n)return response({error:"Draft day number mismatch"},400);
 }else if(typeof draft.entry.title!=="string"||!draft.entry.title.trim())return response({error:"Invalid postcard title"},400);
 let source;
 try{source=await readGithub(env,target.path)}
 catch(e){return response({error:e.detail||"Source verification unavailable"},e.status||503)}
 if(source.sha!==draft.base_sha)return response({error:"Published content has changed since this draft began. Nothing was overwritten. Compare and make a new draft before publishing."},409);
 if(JSON.stringify(source.entry)===JSON.stringify(draft.entry))
  return response({error:"No changes to publish; the draft matches the current published file."},409);
 const label=String(draft.entry.title||target.title).replace(/[\r\n]/g," ").slice(0,90);
 let published;
 try{published=await writeGithub(env,target.path,source.sha,draft.entry,"Publish postcard: "+label)}
 catch(e){return response({error:e.detail||"Publishing failed"},e.status||503)}
 // A successful GitHub commit is authoritative, even if draft status cannot be updated.
 try{
  await env.PRIVATE_MEDIA.put(target.draftKey,JSON.stringify({
   ...draft,base_sha:published.file_sha,status:"published_pending_deploy",
   published_at:new Date().toISOString(),published_commit:published.commit_sha
  }),{httpMetadata:{contentType:"application/json",cacheControl:"private, no-store"}});
 }catch{ /* GitHub commit already succeeded; never report a false failure */ }
 return response({ok:true,published:true,commit_sha:published.commit_sha,
  commit_url:published.commit_url,source_path:target.path,
  message:"Committed to GitHub. Cloudflare deployment may still be in progress."});
}

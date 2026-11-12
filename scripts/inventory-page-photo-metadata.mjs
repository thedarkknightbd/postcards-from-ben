#!/usr/bin/env node
// Read-only inventory of photos referenced by published site source.
// Requires GITHUB_TOKEN for private repositories and MEDIA_UPLOAD_TOKEN for PHOTO_DB lookup.
// Never commits or publishes the resulting report.
import { mkdir, writeFile } from 'node:fs/promises';
const owner = process.env.GITHUB_REPOSITORY || 'thedarkknightbd/postcards-from-ben';
const ref = process.env.SOURCE_REF || 'main';
const token = process.env.MEDIA_UPLOAD_TOKEN;
const site = (process.env.SITE_ORIGIN || 'https://postcardsfromben.com').replace(/\/$/, '');
const out = process.env.OUTPUT_DIR || 'photo-metadata-report';
if (!token) throw new Error('MEDIA_UPLOAD_TOKEN required; no anonymous metadata access');
const ghHeaders = {'Accept':'application/vnd.github+json',...(process.env.GITHUB_TOKEN?{Authorization:'Bearer '+process.env.GITHUB_TOKEN}:{})};
async function get(url,headers={}) {const res=await fetch(url,{headers});if(!res.ok)throw Error(res.status+' '+url);return res;}
const tree=await (await get('https://api.github.com/repos/'+owner+'/git/trees/'+encodeURIComponent(ref)+'?recursive=1',ghHeaders)).json();
if(tree.truncated)throw Error('GitHub tree truncated; cannot claim complete inventory');
const paths=tree.tree.filter(x=>x.type==='blob' && /\.(html|json|js|md)$/i.test(x.path) && !/^(node_modules|\.github|docs|scripts|functions)\//.test(x.path)).map(x=>x.path);
const photoRefs=new Map();
const rx=/(?:https?:\\?\/\\?\/photos\.postcardsfromben\.com\\?\/|https?:\/\/photos\.postcardsfromben\.com\/|\/)?(trips\/[-a-z0-9]+\/(?:days\/day-\d{2}\/(?:videos\/)?|hero\/|gallery\/)[^\s"'<>\\),;]+?\.(?:jpe?g|png|webp|avif|gif|heic|heif))/gi;
for(const path of paths){
  const res=await get('https://raw.githubusercontent.com/'+owner+'/'+encodeURIComponent(ref)+'/'+path,ghHeaders);
  const content=await res.text();
  for(const match of content.matchAll(rx)){
    const key=match[1].replace(/\\\//g,'/');
    if(!photoRefs.has(key))photoRefs.set(key,new Set());
    photoRefs.get(key).add(path);
  }
}
const results=[];
for(const [key,pages] of photoRefs){
  let photo=null,error=null;
  try {
    const res=await fetch(site+'/api/photo-metadata?key='+encodeURIComponent(key),{headers:{Authorization:'Bearer '+token}});
    if(!res.ok)throw Error('HTTP '+res.status);
    photo=(await res.json()).photo;
  }catch(e){error=String(e.message||e)}
  const adventure=key.match(/^trips\/([^/]+)/)?.[1]||null;
  const day=key.match(/\/day-(\d{2})\//)?.[1]||null;
  results.push({key,url:'https://photos.postcardsfromben.com/'+key,source_pages:[...pages],adventure,day,metadata_found:!!photo,error,photo});
}
await mkdir(out,{recursive:true});
await writeFile(out+'/inventory.json',JSON.stringify({generated_at:new Date().toISOString(),source_ref:ref,scanned_files:paths.length,referenced_photos:results.length,photos:results},null,2));
const fields=['key','url','source_pages','adventure','day','metadata_found','taken_at','latitude','longitude','gps_altitude_m','camera_make','camera_model','caption','alt_text','status','error'];
const csv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
await writeFile(out+'/inventory.csv',[fields.join(','),...results.map(r=>fields.map(f=>csv(f==='source_pages'?r.source_pages.join(' | '):f in r?r[f]:r.photo?.[f])).join(','))].join('\n')+'\n');
console.log(JSON.stringify({scanned_files:paths.length,referenced_photos:results.length,metadata_found:results.filter(x=>x.metadata_found).length,missing_metadata:results.filter(x=>!x.metadata_found).length,output:out}));

import {currentUser,isOwner,response} from "../_lib/access-auth.js";
import {extractJpegMetadata} from "../_lib/jpeg-exif.js";

const IMAGE=/\.(?:jpe?g|png|webp|avif|heic|heif|gif)$/i;
const PRIVATE_IMAGE=/^albums\/(?:special-moments|bethel-visits|friends-along-the-way)\/(?:[0-9a-f-]{36}\/)?[0-9a-f-]{36}\.(?:jpe?g|png|webp|avif)$/i;
const PUBLIC_IMAGE=/^trips\/[a-z0-9-]+\/.+\.(?:jpe?g|png|webp|avif|heic|heif|gif)$/i;
const MAX_BYTES=262144;
const BATCH=10;
const META_FIELDS=["taken_at","latitude","longitude","gps_altitude_m","camera_make","camera_model",
 "lens_model","software","aperture","shutter_speed","iso","focal_length_mm","pixel_width","pixel_height"];
const privateMetaKey=key=>"internal/photo-details/"+key.split("/").pop().split(".")[0]+".json";
const imageType=key=>{const ext=key.split(".").pop().toLowerCase();return ext==="jpg"?"image/jpeg":"image/"+ext};
async function extract(bucket,key){
 const object=await bucket.get(key,{range:{offset:0,length:MAX_BYTES}});
 if(!object)return {};
 if(!/\.jpe?g$/i.test(key))return {};
 const header=await object.arrayBuffer();
 return extractJpegMetadata(header);
}
async function scanPrivate(env,item){
 const key=item.key;
 const metaKey=privateMetaKey(key);
 const previous=await env.PRIVATE_MEDIA.get(metaKey);
 let existing={};
 if(previous){try{existing=await previous.json()}catch{return "error"}}
 const extracted=await extract(env.PRIVATE_MEDIA,key);
 const additions={};
 for(const [field,value] of Object.entries(extracted)){
  if(existing[field]==null||existing[field]==="")additions[field]=value;
 }
 // Do not invent an original filename for historical UUID-based uploads.
 if(!existing.original_filename&&item.customMetadata?.originalName)
  additions.original_filename=String(item.customMetadata.originalName).slice(0,260);
 if(existing.file_size_bytes==null)additions.file_size_bytes=item.size;
 if(!existing.mime_type)additions.mime_type=item.httpMetadata?.contentType||imageType(key);
 if(!existing.uploaded_at)additions.uploaded_at=item.uploaded?.toISOString?.()||new Date().toISOString();
 const next={...existing,...additions,scan_version:1,scanned_at:new Date().toISOString()};
 await env.PRIVATE_MEDIA.put(metaKey,JSON.stringify(next),{
  httpMetadata:{contentType:"application/json",cacheControl:"private, no-store"}
 });
 return Object.keys(extracted).length?"extracted":"partial";
}
async function availableColumns(db){
 const result=await db.prepare("PRAGMA table_info(photos)").all();
 return new Set((result.results||[]).map(r=>r.name));
}
async function scanPublic(env,item,columns){
 const key=item.key;
 const extracted=await extract(env.POSTCARDS_MEDIA,key);
 const available=META_FIELDS.filter(k=>columns.has(k)&&extracted[k]!=null&&extracted[k]!=="");
 const filename=item.customMetadata?.originalName||key.split("/").pop();
 const db=env.PHOTO_DB;
 // Existing captions, status, country, day, title and other user edits remain intact.
 const record=await db.prepare("SELECT id FROM photos WHERE r2_key=?").bind(key).first();
 if(!record){
  const cols=["id","r2_key","original_filename","media_type","status"];
  const params=[crypto.randomUUID(),key,String(filename).slice(0,260),"image","published"];
  for(const field of available){
   cols.push(field);params.push(["latitude","longitude","gps_altitude_m","aperture","shutter_speed","iso","focal_length_mm","pixel_width","pixel_height"].includes(field)?Number(extracted[field]):String(extracted[field]));
  }
  await db.prepare("INSERT OR IGNORE INTO photos ("+cols.join(",")+") VALUES ("+cols.map(()=>"?").join(",")+")").bind(...params).run();
 }else if(available.length){
  // Fill empty fields only. Never replace values the owner has already saved.
  const updates=available.map(field=>field+"=CASE WHEN "+field+" IS NULL OR "+field+"=\'\' THEN ? ELSE "+field+" END").join(",");
  const params=available.map(field=>["latitude","longitude","gps_altitude_m","aperture","shutter_speed","iso","focal_length_mm","pixel_width","pixel_height"].includes(field)?Number(extracted[field]):String(extracted[field]));
  await db.prepare("UPDATE photos SET "+updates+" WHERE r2_key=?").bind(...params,key).run();
 }
 return Object.keys(extracted).length?"extracted":"partial";
}
export async function onRequestPost({request,env}){
 let user;try{user=await currentUser(request,env)}catch{}
 if(!isOwner(user))return response({error:"Not found"},404);
 if(request.headers.get("origin")!==new URL(request.url).origin)return response({error:"Invalid origin"},403);
 if(Number(request.headers.get("content-length")||0)>4000)return response({error:"Request too large"},413);
 let body;try{body=await request.json()}catch{return response({error:"Invalid request"},400)}
 const library=body?.library;
 if(!["public","private"].includes(library))return response({error:"Invalid library"},400);
 if(body.cursor!=null&&(typeof body.cursor!=="string"||body.cursor.length>2048))return response({error:"Invalid cursor"},400);
 const bucket=library==="public"?env.POSTCARDS_MEDIA:env.PRIVATE_MEDIA;
 if(!bucket||(library==="public"&&!env.PHOTO_DB))return response({error:"Storage binding is missing"},503);
 const prefix=library==="public"?"trips/":"albums/";
 let page;try{page=await bucket.list({prefix,limit:BATCH,...(body.cursor?{cursor:body.cursor}:{})})}
 catch{return response({error:"Could not list photographs"},503)}
 let columns=new Set();
 if(library==="public"){
  try{columns=await availableColumns(env.PHOTO_DB)}
  catch{return response({error:"Could not access public photo metadata database"},503)}
  if(!columns.has("r2_key")||!columns.has("id"))return response({error:"Photo database schema missing required fields"},503);
 }
 const result={library,checked:0,extracted:0,partial:0,skipped:0,errors:0,failures:[],
  nextCursor:page.truncated?page.cursor:null,done:!page.truncated};
 for(const item of page.objects){
  const key=item.key;
  if(!IMAGE.test(key)||(library==="public"?!PUBLIC_IMAGE.test(key):!PRIVATE_IMAGE.test(key))){result.skipped++;continue}
  result.checked++;
  try{
   const outcome=library==="public"?await scanPublic(env,item,columns):await scanPrivate(env,item);
   if(outcome==="extracted")result.extracted++;
   else if(outcome==="partial")result.partial++;
   else result.errors++;
  }catch(error){
   result.errors++;
   if(result.failures.length<3)result.failures.push({key,error:"Scan failed; original image was not changed"});
  }
 }
 return response(result);
}

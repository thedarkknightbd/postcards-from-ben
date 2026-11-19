// Country-specific public Travel Atlas photos.
// Read only public trip media from POSTCARDS_MEDIA; never access PRIVATE_MEDIA.
const json=(data,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=60","x-content-type-options":"nosniff"}
});
const imageKey=key=>typeof key==="string"&&
  /^trips\/[a-z0-9-]+\/(?:days\/day-(?:0[1-9]|1[0-9]|2[0-4])\/|hero\/|gallery\/)[^/]+\.(?:avif|gif|jpe?g|png|webp)$/i.test(key);
const publicUrl=(env,key)=>(env.MEDIA_PUBLIC_BASE_URL||"https://photos.postcardsfromben.com").replace(/\/$/,"")+
  "/"+key.split("/").map(encodeURIComponent).join("/");

// Fallback for public image folders whose country can be determined with confidence.
// Mixed-country days are deliberately excluded: they need manual metadata tags.
const knownFolders={
  IT:[7,8,9,10,13,14,16],
  DE:[20,21,22]
};
const countryTrips={
  KE:["under-the-mara-sky","an-afternoon-with-giants"],
  HU:["autumn-in-hungary"],
  UA:["winter-on-the-black-sea"]
};
async function publicR2Fallback(env,country,seen){
  if(!env.POSTCARDS_MEDIA)return [];
  const prefixes=[
    ...(knownFolders[country]||[]).map(n=>"trips/the-long-way-around/days/day-"+String(n).padStart(2,"0")+"/"),
    ...(countryTrips[country]||[]).flatMap(slug=>["trips/"+slug+"/hero/","trips/"+slug+"/gallery/"])
  ];
  const output=[];
  for(const prefix of prefixes){
    if(output.length>=24)break;
    // One bounded R2 page per known public folder. Hidden/private media is never scanned.
    const listing=await env.POSTCARDS_MEDIA.list({prefix,limit:100});
    for(const item of listing.objects||[]){
      const key=item.key;
      if(!imageKey(key)||seen.has(key)||key.slice(prefix.length).includes("/"))continue;
      seen.add(key);
      output.push({key,src:publicUrl(env,key),caption:"",alt:"Travel photograph",destination:""});
      if(output.length>=24)break;
    }
  }
  return output;
}
export async function onRequestGet({request,env}){
  const country=String(new URL(request.url).searchParams.get("country")||"").trim().toUpperCase();
  if(!/^[A-Z]{2}$/.test(country))return json({error:"Invalid country"},400);
  const seen=new Set(),photos=[];
  let databaseAvailable=Boolean(env.PHOTO_DB);
  if(env.PHOTO_DB){
    try{
      const result=await env.PHOTO_DB.prepare(`
        SELECT p.r2_key,p.caption,p.alt_text,p.taken_at,d.name AS destination
        FROM photos p
        JOIN photo_destinations pd ON pd.photo_id=p.id AND pd.is_primary=1
        JOIN destinations d ON d.id=pd.destination_id
        WHERE d.country_code=? AND p.status='published'
        ORDER BY COALESCE(p.taken_at,p.created_at) DESC,p.r2_key LIMIT 80
      `).bind(country).all();
      for(const p of result.results||[]){
        if(!imageKey(p.r2_key)||seen.has(p.r2_key))continue;
        seen.add(p.r2_key);
        photos.push({
          src:publicUrl(env,p.r2_key),
          caption:String(p.caption||"").slice(0,300),
          alt:String(p.alt_text||p.caption||p.destination||"Travel photograph").slice(0,300),
          description:String(p.alt_text||"").slice(0,500),
          destination:String(p.destination||"").slice(0,120)
        });
        if(photos.length>=24)break;
      }
    }catch{databaseAvailable=false;}
  }
  // Metadata remains authoritative. Fallback exposes only explicitly known public
  // single-country folders and only if there are fewer than 24 tagged images.
  if(photos.length<24){
    try{
      const fallback=await publicR2Fallback(env,country,seen);
      photos.push(...fallback.slice(0,24-photos.length).map(({key,...photo})=>photo));
    }catch{
      // Keep any already indexed photos even when the R2 list operation fails.
    }
  }
  return json({photos,available:databaseAvailable||Boolean(env.POSTCARDS_MEDIA)});
}

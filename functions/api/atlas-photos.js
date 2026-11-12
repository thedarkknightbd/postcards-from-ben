// Read-only public Atlas photo index. No upload key or exact GPS coordinates exposed.
// Only photos assigned to a destination are listed; pagination limits query costs.
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=120","x-content-type-options":"nosniff"}});
export async function onRequestGet({request,env}) {
  if(!env.PHOTO_DB) return json({error:"Photo index unavailable"},503);
  const q=new URL(request.url).searchParams;
  const country=(q.get("country")||"").trim().toUpperCase();
  const adventure=(q.get("adventure")||"").trim();
  const destination=(q.get("destination")||"").trim();
  const page=Math.max(1,Math.min(10000,parseInt(q.get("page")||"1",10)||1));
  if(country&&!/^[A-Z]{2}$/.test(country))return json({error:"Invalid country"},400);
  if(adventure&&!/^[a-z0-9-]{1,100}$/.test(adventure))return json({error:"Invalid adventure"},400);
  if(destination&&destination.length>120)return json({error:"Invalid destination"},400);
  const conditions=["p.media_type='image'","d.country_code IS NOT NULL"],args=[];
  if(country){conditions.push("d.country_code=?");args.push(country);}
  if(destination){conditions.push("d.name=?");args.push(destination);}
  if(adventure){conditions.push("EXISTS (SELECT 1 FROM photo_adventures a2 WHERE a2.photo_id=p.id AND a2.adventure_slug=?)");args.push(adventure);}
  try {
    const rows=await env.PHOTO_DB.prepare(`SELECT p.r2_key,p.caption,p.alt_text,p.taken_at,d.name AS destination,d.country_code AS country,
      (SELECT a.adventure_slug FROM photo_adventures a WHERE a.photo_id=p.id ORDER BY a.id LIMIT 1) AS adventure,
      (SELECT a.day_number FROM photo_adventures a WHERE a.photo_id=p.id ORDER BY a.id LIMIT 1) AS day
      FROM photos p JOIN photo_destinations pd ON pd.photo_id=p.id AND pd.is_primary=1
      JOIN destinations d ON d.id=pd.destination_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY p.taken_at DESC,p.r2_key LIMIT 40 OFFSET ?`).bind(...args,(page-1)*40).all();
    return json({items:(rows.results||[]).map(({r2_key,...rest})=>({...rest,image_url:"https://photos.postcardsfromben.com/"+r2_key})),page,pageSize:40});
  } catch {return json({error:"Could not load Atlas photos"},500);}
}

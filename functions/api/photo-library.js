// Private searchable photo metadata index. Read-only; R2 objects remain unchanged.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
export async function onRequestGet({request,env}) {
  if (!env.PHOTO_DB) return json({error:"PHOTO_DB is not configured"},503);
  if (!env.MEDIA_UPLOAD_TOKEN || request.headers.get("Authorization")!==`Bearer ${env.MEDIA_UPLOAD_TOKEN}`) return json({error:"Unauthorized"},401);
  const q=new URL(request.url).searchParams;
  const search=(q.get("q")||"").trim().slice(0,100);
  const country=(q.get("country")||"").trim().toUpperCase().slice(0,2);
  const adventure=(q.get("adventure")||"").trim().slice(0,100);
  const day=(q.get("day")||"").trim();
  const status=(q.get("status")||"").trim();
  const page=Math.min(10000,Math.max(1,Number.parseInt(q.get("page")||"1",10)||1));
  if (country && !/^[A-Z]{2}$/.test(country)) return json({error:"Invalid country"},400);
  if (status && !["needs_review","draft","published","untagged"].includes(status)) return json({error:"Invalid status"},400);
  if (day && (!/^\d{1,3}$/.test(day)||Number(day)<1||Number(day)>366)) return json({error:"Invalid day"},400);
  const conditions=["1=1"], params=[];
  if(search){conditions.push("(p.original_filename LIKE ? OR p.caption LIKE ? OR p.alt_text LIKE ? OR EXISTS (SELECT 1 FROM photo_destinations pd JOIN destinations d ON d.id=pd.destination_id WHERE pd.photo_id=p.id AND d.name LIKE ?))");for(let i=0;i<4;i++)params.push("%"+search+"%");}
  if(country){conditions.push("EXISTS (SELECT 1 FROM photo_destinations pd JOIN destinations d ON d.id=pd.destination_id WHERE pd.photo_id=p.id AND d.country_code=?)");params.push(country);}
  if(adventure){conditions.push("EXISTS (SELECT 1 FROM photo_adventures a WHERE a.photo_id=p.id AND a.adventure_slug=?)");params.push(adventure);}
  if(day){conditions.push("EXISTS (SELECT 1 FROM photo_adventures a WHERE a.photo_id=p.id AND a.day_number=?)");params.push(Number(day));}
  if(status==="untagged")conditions.push("NOT EXISTS (SELECT 1 FROM photo_destinations pd WHERE pd.photo_id=p.id)");
  else if(status){conditions.push("p.status=?");params.push(status);}
  const where=conditions.join(" AND ");
  try{
    const count=await env.PHOTO_DB.prepare("SELECT COUNT(*) AS n FROM photos p WHERE "+where).bind(...params).first();
    const rows=await env.PHOTO_DB.prepare(`SELECT p.id,p.r2_key,p.original_filename,p.caption,p.status,p.featured,p.taken_at,
      (SELECT d.country_code FROM photo_destinations pd JOIN destinations d ON d.id=pd.destination_id WHERE pd.photo_id=p.id ORDER BY pd.is_primary DESC LIMIT 1) country,
      (SELECT d.name FROM photo_destinations pd JOIN destinations d ON d.id=pd.destination_id WHERE pd.photo_id=p.id ORDER BY pd.is_primary DESC LIMIT 1) destination,
      (SELECT a.adventure_slug FROM photo_adventures a WHERE a.photo_id=p.id ORDER BY a.id LIMIT 1) adventure,
      (SELECT a.day_number FROM photo_adventures a WHERE a.photo_id=p.id ORDER BY a.id LIMIT 1) day
      FROM photos p WHERE ${where} ORDER BY p.updated_at DESC,p.r2_key LIMIT 40 OFFSET ?`).bind(...params,(page-1)*40).all();
    return json({items:rows.results||[],total:count?.n||0,page,pageSize:40});
  }catch{return json({error:"Could not search photo metadata"},500);}
}

// Public Travel Atlas: published photographs only, indexed by their primary country.
// This endpoint never accesses PRIVATE_MEDIA or exposes owner-only photo metadata.
const json=(data,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=60","x-content-type-options":"nosniff"}
});
const isPublicKey=key=>typeof key==="string"&&
  /^trips\/[a-z0-9-]+\/(?:days\/day-(?:0[1-9]|1[0-9]|2[0-4])\/|hero\/|gallery\/)[^/]+\.(?:avif|gif|jpe?g|png|webp)$/i.test(key);
export async function onRequestGet({request,env}){
  const q=new URL(request.url).searchParams;
  const country=String(q.get("country")||"").trim().toUpperCase();
  if(!/^[A-Z]{2}$/.test(country))return json({error:"Invalid country"},400);
  if(!env.PHOTO_DB)return json({photos:[],available:false},200);
  try{
    const results=await env.PHOTO_DB.prepare(`
      SELECT p.r2_key,p.caption,p.alt_text,p.taken_at,d.name AS destination
      FROM photos p
      JOIN photo_destinations pd ON pd.photo_id=p.id AND pd.is_primary=1
      JOIN destinations d ON d.id=pd.destination_id
      WHERE d.country_code=? AND p.status='published'
      ORDER BY COALESCE(p.taken_at,p.created_at) DESC,p.r2_key
      LIMIT 80
    `).bind(country).all();
    const photos=(results.results||[])
      .filter(p=>isPublicKey(p.r2_key))
      .slice(0,24)
      .map(p=>({
        src:"https://photos.postcardsfromben.com/"+p.r2_key.split("/").map(encodeURIComponent).join("/"),
        caption:String(p.caption||"").slice(0,300),
        alt:String(p.alt_text||p.caption||p.destination||"Travel photograph").slice(0,300),
        destination:String(p.destination||"").slice(0,120)
      }));
    return json({photos,available:true});
  }catch{
    return json({error:"Photographs unavailable"},503);
  }
}

// Private photo metadata API. All operations require the existing media upload key.
// Uses PHOTO_DB exclusively; never touches LOCATION_DB.
const reply = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
});
const clean = (v, max = 500) => typeof v === "string" ? v.trim().slice(0, max) : "";
const slug = s => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
const mediaKey = key => /^trips\/[a-z0-9-]+\/(?:days\/day-(?:0[1-9]|1[0-9]|2[0-4])\/(?:videos\/)?|hero\/|gallery\/|videos\/)[^/]+\.(?:avif|gif|heic|heif|jpe?g|png|webp|mp4|mov)$/i.test(key);
const image = key => !/\.(mp4|mov)$/i.test(key);
const derive = key => {
  const m = key.match(/^trips\/([^/]+)\/(?:days\/day-(\d{2})\/)?/);
  return { adventure: m?.[1] || "", day: m?.[2] ? Number(m[2]) : null };
};
async function detail(db, key) {
  const photo = await db.prepare("SELECT * FROM photos WHERE r2_key = ?").bind(key).first();
  if (!photo) return null;
  const destinations = await db.prepare("SELECT d.id, d.name, d.country_code FROM destinations d JOIN photo_destinations pd ON pd.destination_id = d.id WHERE pd.photo_id = ? ORDER BY pd.is_primary DESC").bind(photo.id).all();
  const adventures = await db.prepare("SELECT adventure_slug, day_number, journal_url FROM photo_adventures WHERE photo_id = ? ORDER BY id").bind(photo.id).all();
  return { ...photo, destinations: destinations.results || [], adventures: adventures.results || [] };
}
export async function onRequest({request, env}) {
  if (!env.PHOTO_DB) return reply({error:"PHOTO_DB binding is not configured for this deployment."},503);
  const expected = env.MEDIA_UPLOAD_TOKEN;
  if (!expected || request.headers.get("Authorization") !== `Bearer ${expected}`) return reply({error:"Unauthorized"},401);
  const url = new URL(request.url);
  const key = clean(url.searchParams.get("key"), 700);
  if (request.method === "GET") {
    if (!mediaKey(key)) return reply({error:"Invalid R2 key"},400);
    try { return reply({photo: await detail(env.PHOTO_DB, key)}); }
    catch { return reply({error:"Could not load photo metadata"},500); }
  }
  if (request.method !== "PUT") return reply({error:"Method not allowed"},405);
  let body;
  try { body = await request.json(); } catch { return reply({error:"Invalid JSON"},400); }
  const r2Key = clean(body.key,700);
  if (!mediaKey(r2Key)) return reply({error:"Invalid R2 key"},400);
  if (!env.POSTCARDS_MEDIA || !(await env.POSTCARDS_MEDIA.head(r2Key))) return reply({error:"Photo not found in R2"},404);
  const country = clean(body.country,2).toUpperCase();
  const destination = clean(body.destination,120);
  if (country && !/^[A-Z]{2}$/.test(country)) return reply({error:"Use a two-letter country code"},400);
  if (destination && !country) return reply({error:"Choose a country for the destination"},400);
  const status = clean(body.status,20) || "needs_review";
  if (!["needs_review","draft","published"].includes(status)) return reply({error:"Invalid status"},400);
  const coords = ["latitude","longitude"].map(k => body[k] === "" || body[k] == null ? null : Number(body[k]));
  if ((coords[0] != null && (!Number.isFinite(coords[0]) || Math.abs(coords[0]) > 90)) ||
      (coords[1] != null && (!Number.isFinite(coords[1]) || Math.abs(coords[1]) > 180))) return reply({error:"Invalid coordinates"},400);
  const inferred = derive(r2Key);
  const adventure = clean(body.adventure,100) || inferred.adventure;
  const day = body.day === "" || body.day == null ? inferred.day : Number(body.day);
  if (!/^[a-z0-9-]+$/.test(adventure) || (day != null && (!Number.isInteger(day) || day < 1 || day > 366))) return reply({error:"Invalid adventure or day"},400);
  const journalUrl = day != null ? `/trips/${adventure}/days/day-${String(day).padStart(2,"0")}.html` : `/trips/${adventure}/`;
  const caption = clean(body.caption,1000), alt = clean(body.alt_text,500), taken = clean(body.taken_at,40) || null;
  const id = crypto.randomUUID();
  const db = env.PHOTO_DB;
  try {
    // Upsert metadata without modifying the original R2 object.
    await db.prepare(`INSERT INTO photos (id,r2_key,original_filename,media_type,caption,alt_text,taken_at,latitude,longitude,status,featured)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(r2_key) DO UPDATE SET caption=excluded.caption,alt_text=excluded.alt_text,taken_at=excluded.taken_at,
      latitude=excluded.latitude,longitude=excluded.longitude,status=excluded.status,featured=excluded.featured,updated_at=datetime('now')`)
      .bind(id,r2Key,r2Key.split("/").pop(),image(r2Key)?"image":"video",caption,alt,taken,coords[0],coords[1],status,body.featured?1:0).run();
    const row = await db.prepare("SELECT id FROM photos WHERE r2_key=?").bind(r2Key).first();
    // Replace associations only after photo upsert succeeds.
    await db.prepare("DELETE FROM photo_destinations WHERE photo_id=?").bind(row.id).run();
    if (destination) {
      const destId = slug(country+"-"+destination);
      await db.prepare("INSERT INTO destinations (id,name,country_code) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING").bind(destId,destination,country).run();
      await db.prepare("INSERT INTO photo_destinations (photo_id,destination_id,is_primary) VALUES (?,?,1)").bind(row.id,destId).run();
    }
    await db.prepare("DELETE FROM photo_adventures WHERE photo_id=?").bind(row.id).run();
    await db.prepare("INSERT INTO photo_adventures (photo_id,adventure_slug,day_number,journal_url) VALUES (?,?,?,?)").bind(row.id,adventure,day,journalUrl).run();
    return reply({ok:true,photo:await detail(db,r2Key)});
  } catch { return reply({error:"Could not save metadata. Check the PHOTO_DB schema."},500); }
}

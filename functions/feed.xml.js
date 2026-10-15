// Cloudflare Pages Function: RSS feed of published journal postcards.
// It deliberately excludes itinerary drafts and unpublished days.
const ROOT = "https://postcardsfromben.com";
const TRIP = "/trips/the-long-way-around/";
const escapeXml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[ch]));
export async function onRequestGet({ env }) {
  try {
    const getJson = async path => {
      const response = await env.ASSETS.fetch(new Request(ROOT + path));
      if (!response.ok) throw new Error("Missing site data: " + path);
      return response.json();
    };
    const trip = await getJson(TRIP + "trip.json");
    const days = await Promise.all(trip.days.map(async ref => {
      try { return await getJson(TRIP + ref.file); } catch { return null; }
    }));
    const items = days.filter(day => day && typeof day.journal === "string" && day.journal.trim())
      .filter(day => {
        const date = new Date(day.date + " 12:00:00 GMT");
        return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
      }).sort((a,b) => b.dayNumber - a.dayNumber)
      .map(day => {
        const link = ROOT + TRIP + "days/day-" + String(day.dayNumber).padStart(2,"0") + ".html";
        const date = new Date(day.date + " 12:00:00 GMT");
        return `<item><title>${escapeXml(day.title)}</title><link>${escapeXml(link)}</link><guid isPermaLink="true">${escapeXml(link)}</guid><pubDate>${date.toUTCString()}</pubDate><description>${escapeXml(day.journal.trim())}</description></item>`;
      }).join("");
    const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Postcards from Ben</title><link>${ROOT}/</link><description>New stories and postcards from the road.</description><language>en-us</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`;
    return new Response(xml,{headers:{"Content-Type":"application/rss+xml; charset=utf-8","Cache-Control":"public, max-age=300"}});
  } catch (error) {
    return new Response("Feed temporarily unavailable",{status:503});
  }
}

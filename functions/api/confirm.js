const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,"0")).join("");
const page = (message) => new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Postcards from Ben</title><body style="font:18px system-ui;background:#17212b;color:white;max-width:600px;margin:12vh auto;padding:24px"><h1>Postcards from Ben</h1><p>${message}</p><a style="color:#b8dff5" href="/">Return to the website</a></body></html>`,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
export async function onRequestGet({request,env}) {
  if (!env.DB) return page("Subscriptions are temporarily unavailable.");
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{64}$/.test(token)) return page("This confirmation link is invalid.");
  const result = await env.DB.prepare("UPDATE subscribers SET status='active',confirmed_at=datetime('now'),confirmation_hash=NULL,updated_at=datetime('now') WHERE confirmation_hash=? AND status='pending' AND confirmation_sent_at > datetime('now','-7 days')").bind(await hash(token)).run();
  return page(result.meta.changes ? "You're subscribed! Your email address is confirmed." : "This confirmation link has expired or has already been used.");
}

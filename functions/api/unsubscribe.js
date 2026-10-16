const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,"0")).join("");
const page = message => new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Postcards from Ben</title><body style="font:18px system-ui;background:#17212b;color:white;max-width:600px;margin:12vh auto;padding:24px"><h1>Postcards from Ben</h1><p>${message}</p><a style="color:#b8dff5" href="/">Return to the website</a></body></html>`,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
export async function onRequestGet({request,env}) {
  if (!env.DB) return page("Subscriptions are temporarily unavailable.");
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{64}$/.test(token)) return page("This unsubscribe link is invalid.");
  // GET only shows a confirmation form; email security scanners must not unsubscribe users.
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe · Postcards from Ben</title><body style="font:18px system-ui;background:#17212b;color:white;max-width:600px;margin:12vh auto;padding:24px"><h1>Unsubscribe?</h1><p>Stop receiving Postcards from Ben emails.</p><form method="post"><input type="hidden" name="token" value="${token}"><button style="padding:14px 20px">Confirm unsubscribe</button></form></body></html>`,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
}
export async function onRequestPost({request,env}) {
  if (!env.DB) return page("Subscriptions are temporarily unavailable.");
  const form = await request.formData();
  const token = String(form.get("token") || "");
  if (!/^[a-f0-9]{64}$/.test(token)) return page("This unsubscribe link is invalid.");
  await env.DB.prepare("UPDATE subscribers SET status='unsubscribed',updated_at=datetime('now') WHERE unsubscribe_hash=?").bind(await hash(token)).run();
  return page("You've been unsubscribed. You won't receive further postcards.");
}

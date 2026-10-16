const FROM = "Postcards from Ben <updates@mail.postcardsfromben.com>";
const ORIGIN = "https://postcardsfromben.com";
const enc = new TextEncoder();
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value)))).map(b => b.toString(16).padStart(2,"0")).join("");
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2,"0")).join("");
const reply = (message, status=200) => Response.json({message},{status,headers:{"Cache-Control":"no-store"}});
export async function onRequestPost({request,env}) {
  if (!env.DB || !env.RESEND_API_KEY) return reply("Subscriptions are not available yet.",503);
  if (request.headers.get("origin") !== ORIGIN) return reply("Invalid request.",403);
  if (Number(request.headers.get("content-length") || 0) > 4096) return reply("Request too large.",413);
  let data;
  try { data = await request.json(); } catch { return reply("Invalid request.",400); }
  if (data.website) return reply("Please check your inbox for a confirmation email.");
  const email = String(data.email || "").trim().toLowerCase();
  const frequency = String(data.frequency || "");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["daily","weekly"].includes(frequency)) return reply("Enter a valid email and delivery preference.",400);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await digest(ip);
  const existing = await env.DB.prepare("SELECT status,confirmation_sent_at FROM subscribers WHERE email=?").bind(email).first();
  if (existing?.status === "active") return reply("If this address is subscribed, no further action is needed.");
  if (existing?.confirmation_sent_at && Date.now()-Date.parse(existing.confirmation_sent_at.replace(" ","T")+"Z") < 3600000) return reply("Please check your inbox for a confirmation email.");
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM subscription_requests WHERE ip_hash=? AND created_at > datetime('now','-1 hour')").bind(ipHash).first();
  if (recent.n >= 5) return reply("Too many requests. Please try again later.",429);
  const confirm = token(), unsub = token();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO subscription_requests(ip_hash) VALUES (?)").bind(ipHash),
    env.DB.prepare(`INSERT INTO subscribers(email,frequency,status,confirmation_hash,unsubscribe_hash,confirmation_sent_at,updated_at)
      VALUES (?,?,'pending',?,?,datetime('now'),datetime('now'))
      ON CONFLICT(email) DO UPDATE SET frequency=excluded.frequency,status='pending',confirmation_hash=excluded.confirmation_hash,unsubscribe_hash=excluded.unsubscribe_hash,confirmation_sent_at=datetime('now'),updated_at=datetime('now')`).bind(email,frequency,await digest(confirm),await digest(unsub))
  ]);
  const link = ORIGIN+"/api/confirm?token="+encodeURIComponent(confirm);
  const result = await fetch("https://api.resend.com/emails",{
    method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({from:FROM,to:[email],reply_to:"postcard@postcardsfromben.com",subject:"Confirm your Postcards from Ben subscription",text:`Thanks for joining Postcards from Ben!\n\nConfirm your email address:\n${link}\n\nIf you didn't request this, simply ignore this message.`})
  });
  if (!result.ok) {
    // Allow immediate retry if Resend fails; never expose provider details.
    await env.DB.prepare("UPDATE subscribers SET confirmation_sent_at=NULL WHERE email=? AND status='pending'").bind(email).run();
    return reply("We couldn't send your confirmation email. Please try again later.",503);
  }
  return reply("Please check your inbox for a confirmation email.");
}

import { currentUser, isOwner } from "../_lib/access-auth.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.ACCESS_DB || !env.ACCESS_SESSION_SECRET) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  let authorized = false;
  try { authorized = isOwner(await currentUser(request, env)); } catch { authorized = false; }
  if (!authorized) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } });
  const result = await context.next();
  const headers = new Headers(result.headers);
  headers.set("cache-control", "private, no-store");
  headers.set("x-robots-tag", "noindex, nofollow");
  return new Response(result.body, { status: result.status, headers });
}

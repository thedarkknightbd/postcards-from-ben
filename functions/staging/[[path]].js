import { currentUser, isOwner } from "../_lib/access-auth.js";

// Private integrated staging on the production hostname.
// Fail closed when authentication or the access database is unavailable.
export async function onRequest(context) {
  const { request, env } = context;
  if (!env.ACCESS_DB || !env.ACCESS_SESSION_SECRET) {
    return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  }
  let owner = false;
  try { owner = isOwner(await currentUser(request, env)); } catch { owner = false; }
  if (!owner) {
    return new Response("Not found", {
      status: 404,
      headers: { "cache-control": "no-store", "x-robots-tag": "noindex" }
    });
  }
  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set("cache-control", "private, no-store");
  headers.set("x-robots-tag", "noindex, nofollow");
  return new Response(response.body, { status: response.status, headers });
}

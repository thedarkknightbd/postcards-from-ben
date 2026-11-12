import {currentUser, allowed, isOwner} from "./access-auth.js";

export const privateResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow"
    }
  });

export async function privateMember(request, env) {
  if (!env.ACCESS_DB || !env.ACCESS_SESSION_SECRET || !env.PRIVATE_MEDIA) return null;
  try {
    const user = await currentUser(request, env);
    return isOwner(user) || allowed(user, "private") ? user : null;
  } catch {
    return null;
  }
}
export function owner(user) {
  return isOwner(user);
}
export const collections = new Set(["special-moments", "bethel-visits", "friends-along-the-way"]);
export const privateKey = key =>
  typeof key === "string" &&
  /^albums\/(special-moments|bethel-visits|friends-along-the-way)\/(?:[0-9a-f-]{36}\/)?[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif)$/i.test(key);
export const fileTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"]
]);
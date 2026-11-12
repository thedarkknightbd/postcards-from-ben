import { response, currentUser, isOwner } from "../../_lib/access-auth.js";

// Used by the site UI to show only features the signed-in member may access.
// The server-side gates on private pages and APIs remain authoritative.
export async function onRequestGet({ request, env }) {
  let user = null;
  try { user = await currentUser(request, env); } catch {
    return response({ authenticated: false, role: "public", can_view_location: false, can_view_private: false, can_manage_site: false });
  }
  const role = !user ? "public" : isOwner(user) ? "admin" : user.permission;
  return response({
    authenticated: Boolean(user),
    role,
    can_view_location: ["location", "admin"].includes(role),
    can_view_private: ["private", "admin"].includes(role),
    can_manage_site: role === "admin"
  });
}

# Production access rollout — hold until coordinated

Production configuration confirmed by owner 2026-11-11: Pages ACCESS_DB -> postcards-access, ACCESS_ADMIN_TOKEN, ACCESS_SESSION_SECRET, ACCESS_EMAIL_FROM, RESEND_API_KEY, LOCATION_READ_TOKEN; Worker postcards-live-location has LOCATION_READ_TOKEN and OWNTRACKS_PASSWORD, KV LIVE_LOCATION, D1 LOCATION_HISTORY. Six access_* tables exist.

## Current risk
The production Worker still exposes GET /location publicly. The production /live/ page fetches it directly. Do not switch the Worker first; it would break the public map. Do not treat deploying the Pages proxy alone as securing location: old Worker URL stays public. A controlled cutover is required.

## Exact Worker change (read route only)
At the very start of the existing `if (url.pathname === "/location" && request.method === "GET")` block, before KV lookup, insert:

```js
      const provided = request.headers.get("Authorization");
      if (!env.LOCATION_READ_TOKEN || provided !== `Bearer ${env.LOCATION_READ_TOKEN}`) {
        return jsonResponse({ok:false,message:"Not found."},404,{
          "Cache-Control":"no-store"
        });
      }
```

Keep /owntracks and its Basic authorization unchanged. Do not place LOCATION_READ_TOKEN in any frontend JavaScript. The Pages /api/access/location function sends it server-to-server. CORS does not secure a public endpoint.

## Controlled release sequence
1. Verify production database access_privacy row id=1 exists and live_location_enabled=0; check schema and sign-in email flow in a nonpublic deployment first.
2. Audit and test /live/, /live/index.html, /api/access/location, authenticated member session, navigation links, and any other APIs/widgets that expose location or history. Explicitly protect all aliases and static data. Confirm Pages route Function is invoked for both /live/ and /live/index.html.
3. Prepare Pages main code for release and ensure site frontend uses same-origin /api/access/location (not Worker URL), with authenticated member access and default sharing OFF. Coordinate release with owner; deploy Pages before Worker, with explicit acknowledgment that original Worker remains public during transition.
4. Deploy Worker token check immediately after Pages deployment, preserving /owntracks unchanged. Confirm anonymous GET /location returns 404, and authenticated server proxy returns location only for authorized member when sharing=Yes.
5. Test No returns custom 404 for direct links, API returns 404, OwnTracks ingestion still succeeds, public trip pages unaffected. Test Yes with Location/Private approved users and deny pending/revoked/anonymous.
6. Verify route history, geojson, location APIs, cached responses, and alternate Worker hostnames cannot bypass controls. Rollback carefully; never restore public GET /location as a casual fix.

## Unfinished product features
Passkeys are not yet implemented. Member signup and email-code sign-in need end-to-end testing and abuse/rate limiting review. Admin dashboard uses a temporary bearer admin token, not a production owner login. Do not call the whole access system production-ready before these are resolved.

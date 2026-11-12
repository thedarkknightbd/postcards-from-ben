# Access rollout: release gate and acceptance checks

## Release policy
Do not merge this branch or disable public location until the owner explicitly confirms arrival home and the upstream Worker is protected. Do not expose private media via public R2 URLs. Current public sharing must continue until authorized cutover.

## Prerequisites
- Cloudflare Pages production bindings: ACCESS_DB, ACCESS_SESSION_SECRET, RESEND_API_KEY, ACCESS_EMAIL_FROM, LOCATION_READ_TOKEN.
- Access D1 schema and owner record verified.
- Obtain source/deployment access for independent Worker `postcards-live-location`. Its GET /location MUST require LOCATION_READ_TOKEN or equivalent server-to-server credential, and reject missing/incorrect credentials with 401/403, without returning coordinates. OwnTracks POST must continue unchanged.
- Ensure access_privacy row id=1 exists, live_location_enabled=0 at cutover. Missing setting fails closed.
- Ensure /live/ page and its browser JavaScript cannot call Worker GET directly. Only same-origin authenticated proxy may read it. No public static cached coordinates.
- Admin page and API enforce owner session server-side; no bearer maintenance token in browser.
- Private media served by an authenticated endpoint, not public photos domain. The public Atlas index must filter publication status before deployment.

## Acceptance matrix
1. Anonymous: /access/ loads; /private/ and /admin/access denied; /api/access/location denied; Worker GET denied without token.
2. Pending/public account: sign-in eligibility rules; no private, admin, or location access.
3. Location member: authenticated; location denied when sharing off; allowed only when on; private and admin denied.
4. Private member: private allowed, location follows switch; admin denied.
5. Owner: admin dashboard and user approval/revocation work; owner cannot revoke self via UI; private allowed.
6. Revoked member: existing session immediately rejected on all protected routes.
7. OTP: correct code succeeds once, wrong code rejected, expired/replayed code rejected, rate limit and cookie flags verified.
8. Direct Worker: missing/wrong token rejected even if page hidden; valid token works only for trusted server; verify no CDN caching of sensitive responses.
9. OwnTracks: POST ingestion and D1 history continue after public sharing is disabled.
10. Photos: unapproved images cannot be listed or fetched via direct R2 URL; public photos remain visible.
11. Mobile: iPhone login, navigation, logout and permission changes tested.
12. Rollback: restore previous website code without re-exposing location Worker GET; privacy must fail closed.

## Current result
NOT YET PASSED. Code review and implementation work are not substitutes for deployed endpoint tests. Upstream Worker source/deployment access and end-to-end login testing are still needed. Do not represent this release as production-ready.

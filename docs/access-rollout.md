# Integrated staging and access rollout

## Intended production architecture
- Public: published pages only, no login.
- Location: public pages and protected live-location endpoint.
- Private: location plus private pages and private photos.
- Admin: owner account, user management, CMS/media tools and `/staging/`.
- Owner-only staging is a *deployment area* on the production hostname, not a publicly navigable menu link.

## Already implemented on this branch
- Session-backed owner identity and public/location/private membership checks in `functions/_lib/access-auth.js`.
- User administration in `functions/api/access/admin-users.js`.
- Authenticated live-location API in `functions/api/access/location.js`.
- Owner-only staging route in `functions/staging/[[path]].js` (returns 404 for unauthorized users).

## Required before production release
1. Integrate this branch with the current `main` Media Manager changes and the `feature/site-evolution` redesign. Resolve conflicts; do not overwrite current production code.
2. Confirm `ACCESS_DB` schema, `ACCESS_SESSION_SECRET`, `ACCESS_ADMIN_TOKEN` and `LOCATION_READ_TOKEN` are present in the deployment environment. Never commit secret values.
3. Ensure the *public* `/where-i-am/` page fetches only `/api/access/location`, not the direct live-location Worker. Confirm the direct Worker and any alternate location routes enforce their own authorization. Do not rely on page-level gating alone.
4. Audit R2/photo delivery URLs: private media must be served through authorization-checked endpoints, not public object URLs.
5. Provide a server-protected sign-in experience and no-store responses; verify public/location/private/owner access independently.
6. Test unauthorized direct URL/API requests, revoked sessions, missing bindings, stale sessions, and cache behavior. Keep current location sharing operational until the user approves cutover.
7. Verify `/staging/` with an authenticated owner session on a preview deployment before merging to `main`. Do not assume that the presence of the files means a deployed environment works.
8. Add redesigned pages under `/staging/` after authorization tests; publish individually only after approval.

## Important
An unlinked URL is not private. Use server-side checks. Do not expose production location coordinates or private photos as test fixtures. The owner account remains administratively privileged while testing lower membership levels.

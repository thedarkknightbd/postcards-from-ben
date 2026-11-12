# Secure location sharing integration — November 12, 2026

## What this change adds
- `GET /api/location-live`: checks the approved site session, permits Owner or Location members only, reads the private R2 sharing flag, and refuses data when OFF. No browser receives a Worker access credential.
- `GET /api/location-sharing`: reports Owner/Location status and whether a server-side read token is configured.
- `POST /api/location-sharing`: Owner-only with same-origin protection. Enabling first probes the Worker with **no Authorization header** (must deny with 401, 403 or 404), then with a server-side Bearer token (must return valid JSON coordinates). Stores ON only after both checks pass.
- `/location/`: shows latest position and capture time only while sharing is enabled, with a manual Refresh button. Rechecks the private endpoint each time.
- The existing retired public `/live/` page is unchanged.

## Existing Cloudflare Worker contract (from earlier setup)
- Worker: `https://postcards-live-location.bjdominguez.workers.dev`.
- Protected location GET: `/location` with `Authorization: Bearer <LOCATION_READ_TOKEN>`.
- OwnTracks ingestion: separate `POST /owntracks` using Basic authentication and `OWNTRACKS_PASSWORD`.
- Worker KV: `LIVE_LOCATION` (latest). Worker D1: `LOCATION_HISTORY` (trip history).
- Website Cloudflare Pages expected to have existing secret `LOCATION_READ_TOKEN`, same credential value as the protected Worker. **Do not commit or paste secret values.**

## Why fail closed?
- Missing Pages `LOCATION_READ_TOKEN` means Enable is disabled.
- If a no-token request unexpectedly succeeds, enabled sharing is rejected. The protected read proxy also refuses reads.
- If a token is incorrect, the Worker responds non-200 and the ON setting is refused.
- If sharing is OFF, both Owner and Location members get no coordinates from the new website endpoint.
- Unauthenticated, Private-only, pending, and revoked users have no access to location or settings.
- The Worker URL and token stay server-side; client sees only whitelisted coordinates, timestamp, accuracy, altitude, battery if provided.
- No Worker source/deployment was edited here, so independently verify the current Worker before considering this complete.

## Verification checklist
1. Confirm the latest GitHub `main` commit deployed successfully to Cloudflare Pages.
2. Confirm production Pages has **secret** `LOCATION_READ_TOKEN` set (do not display its value).
3. Independently confirm `GET /location` on Worker without a token returns 401/403/404 and no location JSON.
4. Confirm the Worker still accepts authenticated OwnTracks `POST /owntracks` and writes KV and D1 unchanged.
5. Signed-in Owner: `/location/` shows Enable control; click only when ready to share. The protected probe must pass; ON flag saved.
6. Approved Location member sees current location only when ON. Private member and anonymous session cannot get location.
7. Turn OFF in Owner account; confirm Owner and Location member get 403 and no GPS. Verify direct Worker still denies unauthenticated access.
8. Verify old public live URL and any old custom domains do not bypass authorization.
9. Test revocation and permission changes against `/api/location-live`.

## Separate collection control
This feature controls **sharing through the website**, not OwnTracks' collection or Worker ingestion. It does not delete or modify trip history and does not create a collection toggle. Stop collection using OwnTracks while a Worker-specific ingestion toggle is designed and verified.

# Location controls — initial secure implementation

## Deployed-by-PR scope
- Owner dashboard points to `/location/`, an authenticated page for the Owner and approved Location members.
- GET `/api/location-sharing` reports a private sharing flag. Missing or invalid data defaults to OFF.
- Only a logged-in Owner may POST `sharing:false`. Enable remains server-blocked (HTTP 409) until verified protected Worker integration is implemented.
- The flag is stored in the existing PRIVATE_MEDIA R2 bucket at `internal/location-sharing-v1.json`.
- No live GPS coordinates, location history, OwnTracks tokens, or private Worker URLs are exposed through these new endpoints.

## Security boundaries
- Site Owner session required to change sharing state.
- Location membership is separate from Private album access. Membership by itself cannot enable sharing.
- Same-origin required on POST.
- OwnTracks ingestion and the existing separate `postcards-live-location` Worker are NOT modified by this PR.
- This location flag does NOT stop OwnTracks ingestion. Turning off OwnTracks requires a separate ingestion-side control.
- Historical D1 tracks are not deleted or modified.
- Previously retired public `/live/` remains retired.

## Work before enabling
1. Inspect the deployed separate Worker and verify its ingestion and authenticated GET route and token scheme.
2. Implement server-enforced GET proxy or Worker-to-Pages equivalent that checks owner or Location membership AND stored sharing state on every request. Never trust a client-only toggle.
3. Harden Worker GET to refuse public bypasses and ensure the old public address does not reveal the latest location.
4. Add explicit Owner collection/ingestion control separately, with no route to delete the historic journey.
5. Test anonymous, Private-only, Location member, Owner, revoked account, cross-origin, OFF and ON behavior end to end in Cloudflare production.
6. Only then remove the hard-coded activation refusal.

## Tests completed
Simulated requests: anonymous GET 404; Location GET OFF; Location POST 404; Owner enable 409; Owner disable 200; cross-origin POST 403. JS syntax checks passed. Real deployed Worker integration and Cloudflare status require verification.

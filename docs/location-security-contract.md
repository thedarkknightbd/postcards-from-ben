# Location privacy security contract (development)

## Owner policy
- Share My Location is a single Yes/No control, OFF by default. It controls the entire /live/ page and its data. No timed expiry.
- Only approved members with Location or Private permission may access the page or location data when sharing is Yes.
- When sharing is No, unapproved, revoked, or anonymous visitors receive the site's 404 response even with a direct link.
- Tracking/ingestion from OwnTracks continues independently; turning sharing off does not delete or stop private history collection.
- Missing D1, authentication, settings, or errors must fail closed. Never serve cached private location responses publicly.

## Critical outstanding blocker — original Worker
The current live page historically fetched `https://postcards-live-location.bjdominguez.workers.dev/location` directly. The development page now fetches `/api/access/location` through Pages authentication, but this does NOT secure the original Worker URL. Anyone who knows that URL may still retrieve location data until the Worker itself is changed. Do not launch or represent location privacy as secure before completing this.

Required Worker changes:
1. Separate OwnTracks ingestion from read access. Preserve existing ingestion credentials and avoid exposing them in browser code.
2. Disable public GET /location on the Worker (404/403) or require a server-only shared secret. Pages Function uses the secret to request latest location. Never put it in frontend HTML/JS, public environment variables, or URLs.
3. Keep any history, KV, D1, geojson, and diagnostic endpoints that expose coordinates similarly protected; inventory all routes and hostnames, including any public aliases.
4. Bind a new Worker-read secret to both the Worker and Pages Preview environment; never reuse admin/session/Resend secrets. Change the Pages proxy to send the server-only credential. Return no-store on private responses.
5. Ensure location data is not embedded in static HTML, publicly cached JSON, R2 objects, map tiles, logs, or other client-accessible artifacts.

## Release verification checklist
- With sharing No: /live/, /live/index.html, Pages location API, and direct Worker read URLs cannot expose coordinates to anyone; existing custom 404 is returned for the page.
- With sharing Yes: approved Location/Private sessions can access page and API; Public/pending/revoked/expired/anonymous sessions cannot.
- Changing No immediately blocks existing sessions and direct links, with no cached coordinate leakage.
- A missing or failing ACCESS_DB denies access.
- OwnTracks ingestion continues with sharing No.
- Confirm Preview D1 and Worker test data are isolated from Production; never test live secrets in public browser code.
- Audit any other trip overview widgets, location history, and public API routes before launch.

**Status:** Pages route gate and authenticated proxy are implemented on development branch but untested. Original Worker authorization is NOT implemented; do not deploy privacy feature to Production as a security guarantee.

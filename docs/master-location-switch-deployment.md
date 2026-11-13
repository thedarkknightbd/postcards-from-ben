# Deploy the single recording + private sharing switch

**Important:** The Pages changes can be merged via GitHub, but the separate Cloudflare Worker is **not** deployed by this repository. The switch must not be advertised as operational until all steps are complete. The existing Worker Basic Auth, Bearer token, LIVE_LOCATION KV, and LOCATION_HISTORY D1 must be preserved.

## 1. Create a dedicated D1 database
From Cloudflare D1 SQL Databases, create `postcards-location-control` (not the historical `LOCATION_HISTORY` database). Open its Console and run the SQL in `worker-proposal/location-control-schema.sql`. Confirm the result shows `id:1, enabled:0, enabled_at:null`.

The initial state is OFF. This deliberately pauses Cloudflare recording when the new Worker code is deployed. Existing KV and historical D1 rows are preserved.

## 2. Add the SAME D1 database to both services
- **Cloudflare Pages** project `postcards-from-ben`: Settings → Bindings → Production → Add D1 database binding. Variable name **`LOCATION_CONTROL_DB`**, choose database `postcards-location-control`. Redeploy Pages afterward.
- **Worker** `postcards-live-location`: Settings → Bindings → Add D1 database. Variable name **`LOCATION_CONTROL_DB`**, choose *that exact same* database.
- Keep the existing Pages `LOCATION_WORKER` service binding to `postcards-live-location`, and the existing Pages `LOCATION_READ_TOKEN` secret.
- Keep Worker's `LIVE_LOCATION` KV, `LOCATION_HISTORY` D1, `OWNTRACKS_PASSWORD` and `LOCATION_READ_TOKEN` unchanged.

## 3. Deploy the updated Worker source
In Cloudflare Workers & Pages → `postcards-live-location` → Edit code:
1. Make a backup of the *currently deployed* Worker source.
2. Replace its content with the complete source from `worker-proposal/postcards-live-location-worker.js`.
3. Deploy. **Do not put passwords or Bearer token values in source.** They remain Cloudflare secrets.
4. Check the Worker logs for errors before changing the switch.

## 4. Confirm Pages deployment
Confirm the new main-branch deployment succeeded and that Production has the D1 binding. Navigate to `https://postcardsfromben.com/location/` while signed in as Owner. The page should show **Recording OFF · Private sharing OFF** and the master control ready. The owner diagnostic may report a 404 for `/location` while OFF: the new `/control-status` confirms that this is a safe paused state.

## 5. Test
1. **OFF**: Try sending a valid OwnTracks sample, and verify the Worker returns HTTP 200 but no new `LOCATION_HISTORY` record and no update to `LIVE_LOCATION` KV. The website API must refuse location reads.
2. **ON**: Tap Start recording & sharing, then manually send a **fresh** OwnTracks position from the phone. It should appear in both storage locations and the Owner viewer. Verify approved Location member can view it.
3. **Historical position**: An older sample with `tst` earlier than `enabled_at` must be ignored.
4. **OFF again**: Tap Stop. After stopping, verify direct Bearer GET `/location` returns 404, the Pages viewer returns 403, and subsequent OwnTracks submissions do not create records.
5. Verify unauthenticated GET `/location` and GET `/control-status` return 401; Private-only and revoked website members cannot retrieve location.
6. Verify the existing Europe location history remains intact.

## Known operational boundaries
- OwnTracks in Move mode still measures positions on the phone and sends requests to Cloudflare; OFF prevents *server storage*, not phone collection or sending.
- Website switch may need a fresh page reload after an external change.
- The new ON session initially shows **Waiting for a new OwnTracks position**, not the previous session's last location.
- There is a small unavoidable race when turning OFF while a separate KV/D1 write is already in flight. D1 master state and history storage are separate databases, so they do not form a single atomic transaction. To guarantee a strict cut-off, a more extensive ingestion architecture with transactional writes in one database would be needed.
- This controls future recording and sharing, **not deletion** of historical records or any alternate ingestion endpoints that may be deployed outside this Worker.

## Rollback
If needed, put OwnTracks in Manual, switch OFF if possible, restore the backed-up Worker source, and deploy. **A restored legacy Worker does not enforce recording OFF**, so leave OwnTracks in Manual until the gate is restored. Restoring source alone does not delete history.

Cloudflare D1 bindings: https://developers.cloudflare.com/pages/functions/bindings/

# Location master switch — Worker integration checklist

**Current production limitation:** Pages controls website viewing. The independent `postcards-live-location` Worker still accepts authorized OwnTracks writes. The new `worker-proposal/location-recording-gate.js` is **not executed by production**.

## Target behavior
- ON: after owner's authenticated action, accept current OwnTracks samples and save them to existing `LIVE_LOCATION` KV and `LOCATION_HISTORY` D1; approved Location members can view via protected Pages proxy.
- OFF: no new OwnTracks points are written, and no viewer can retrieve location through Pages.
- ON again: reject buffered updates captured before the enable timestamp, so a queued backlog is not silently inserted.
- Preserve historic trip records and existing Basic Auth, bearer read-token security, routing, and metadata.

## Least-privilege shared state
Use a **dedicated Cloudflare D1 database** for the privacy control instead of a KV namespace or a binding to the private photo R2 bucket. Bind it to **both** Pages and the location Worker as `LOCATION_CONTROL_DB`. Create a single-row `location_control` table: `id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 0, enabled_at TEXT`. Missing database or row must mean OFF. D1 permits a consistent authoritative OFF state without relying on potentially stale KV edge caches.

## Worker implementation (after verifying currently deployed source)
1. Preserve existing `POST /owntracks` Basic Auth. After successful authentication but **before any LIVE_LOCATION KV or LOCATION_HISTORY D1 write**, parse the incoming OwnTracks timestamp (`tst`).
2. Call `shouldRecordLocation(env, tst)`. If `record=false`, return a successful no-write response so OwnTracks does not queue retries. Do not accidentally call existing write operations afterward.
3. When `record=true`, execute **all existing** KV and D1 writes exactly as before.
4. Protect GET `/location` with existing Bearer token independently, preserving the separate protected Pages read proxy.
5. Test OFF while OwnTracks is in Move: KV latest and D1 row counts do **not** change. Test ON: fresh positions write. Test old buffered points: excluded. Test anonymous and revoked users: no website location.
6. Ensure the Pages toggle reads and writes the **same** `LOCATION_CONTROL_DB` database, and only allows ON after an ingestion-gate readiness check. Do not ship an "ON means recording" label prematurely.
7. Confirm whether the Worker also has alternate ingestion routes or history writes; gate all of them.

The integration cannot be safely deployed from this repository alone because the currently deployed Worker source and Cloudflare Worker write connection are not available. The last known source appeared in prior chats, but may differ from deployed code. No Worker source, binding, storage, or ingestion endpoint has been changed by this proposal.

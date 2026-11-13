# Private location viewer improvements

## What changed
- Owner and approved Location members get an interactive Leaflet 1.9.4 / OpenStreetMap map **only after** the protected `/api/location-live` endpoint returns valid coordinates while sharing is enabled.
- The status badge distinguishes **Recently updated** (last 5 minutes) from **Last known location**; timestamp and relative age are shown in the viewer's local timezone.
- The location viewer automatically polls every 60 seconds while the page is open. It rechecks sharing state before polling. Relative time display is refreshed every 30 seconds.
- The viewer stops polling, hides the map, clears coordinates, and removes map tiles when OFF. It never loads the Leaflet mapping library or requests map tiles when sharing is OFF.
- When sharing is ON but there is no fresh OwnTracks position, the viewer shows a waiting state rather than a previous session's location.
- A manual Refresh button remains. Connection Diagnostics are available under collapsible Advanced settings to Owners only.
- The map library is pinned to Leaflet 1.9.4 CDN; map tiles come from OpenStreetMap and include required attribution. Loading the map sends approximate tile-area requests to OpenStreetMap. This is disclosed in the UI.

## Security and scope
- No changes to server-side permission checks, D1 switch state, OwnTracks ingestion, KV history, credentials, or the separate location Worker.
- The site still requires the user's approved session with Owner or Location permission, an enabled master switch, and a verified Worker recording gate.
- Closing the page stops periodic polling. Switching off from another tab is detected at the next 60-second poll, though server-side access is revoked immediately.
- This page represents only the current or last received **post-enable** position; it is not a public location history browser.

## Checks performed
- JavaScript syntax check passed.
- Simulated OFF: `/api/location-sharing` requested; `/api/location-live` was never requested.
- Simulated ON with no location: `/api/location-live` 404 displays a waiting state.
- Simulated OFF again: the map is hidden and location timestamp cleared.
- Live browser layout, map tiles, and actual iPad Safari rendering still require verification after deployment.

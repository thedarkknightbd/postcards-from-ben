# Private location permissions and retirement audit — November 18, 2026

## Code checks
The existing server-side `currentUser` function loads only approved users with non-revoked, unexpired sessions. `allowed(user,"location")` permits only approved Location members; Owner access is checked separately. The `/location/` Pages Function protects the HTML response; `/api/location-live` independently protects coordinates and requires the D1 master switch ON plus the Worker recording-gate probe. `/api/location-sharing` allows approved Location members to GET state, but allows the Owner only to POST ON/OFF (with an origin check). No authentication credential or location coordinate is added to the dashboard status.

Tested source-backed scenarios with mocked sessions, D1, and upstream:
| Account | Read when sharing ON | Master POST |
| --- | --- | --- |
| Owner | 200 | 200 |
| Approved Location | 200 | 404 |
| Approved Private | 404 | 404 |
| Revoked Location | 404 | 404 |
| Anonymous | 404 | 404 |

The public `/live/` route is now explicitly retired by `functions/live/[[path]].js` with a 404, no-cache and noindex response; it never redirects to the private map. Production must be checked after Pages deployment, including trailing-slash and nested variants.

## User experience fixes
- After email-code verification, Owner goes to `/admin/`, approved Location member to `/location/`, Private member to `/beyond-the-postcard/`, and other approved accounts to `/`. The application already enforces server-side access; this is a navigation fix only.
- Admin dashboard Location Management tile now links to the existing master switch and private map without saying the Worker is unconfigured.
- Admin banner now reads the authenticated `/api/location-sharing` state, shows ON/OFF only when the Worker recording gate is verified, and otherwise warns that status cannot be confirmed.

## Remaining live security checks
1. Confirm the new GitHub main deployment completed in Cloudflare Pages.
2. While switch OFF: direct `https://postcardsfromben.com/live/` returns 404; `/location/` requires an approved session; `/api/location-live` returns no coordinates.
3. When safe to test: enable for a short window, report a fresh OwnTracks point, have an independently approved Location member sign in and open `/location/`, confirm map visibility. Verify member sees no Start/Stop controls.
4. In a separate anonymous or Private-only session, ensure neither the map nor `/api/location-live` returns location.
5. Turn switch OFF; have the Location member refresh. Coordinates must disappear; subsequent OwnTracks samples must not be stored.
6. Confirm D1 history and KV latest item have not changed due to any OFF sample; European trip history preserved.

No Worker or Cloudflare resource changes are made in this PR. Avoid sharing location publicly or temporarily approving an untrusted account just to test.

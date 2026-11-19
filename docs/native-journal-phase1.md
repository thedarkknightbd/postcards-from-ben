# Native admin — Trips & Journals (Phase 1)

## URL and authentication
- Owner-only editor: `/admin/journals/`. Existing `functions/admin/[[path]].js` enforces the same approved owner session as `/admin/`.
- Draft API: `/api/admin/journal?day=01` through `day=24`, owner-only and protected on all methods.
- Existing Decap CMS remains at `/admin/editor/`; site content is unchanged.

## Data and safety
- Published content remains the 24 existing JSON files in `trips/the-long-way-around/data/day-XX.json`.
- All 24 existing files were found; largest was about 12 KB.
- Private drafts are stored under `internal/cms-drafts/long-way-around/day-XX.json` in the existing `PRIVATE_MEDIA` R2 bucket.
- GET retrieves a draft, POST saves one, DELETE discards it. GET without a day lists draft day numbers. Only approved Owner access is permitted.
- Saves require a same-origin request, a valid existing day number, sane text/array lengths, valid JSON, and a matching `dayNumber`. No GitHub write token is in client source.
- Drafts preserve untouched JSON keys, including photo/video collections and existing navigation metadata. The UI currently edits the title, date, route, story heading, story, postcard journal, kilometers driven, facts and stops. Facts and stops are JSON text areas in this first release.
- The **Download JSON** action exports the current editable JSON. **Save private draft does not publish to GitHub or the public site.**
- An old draft can be deleted with **Discard draft** after a confirmation.
- The browser shows an unsaved-change warning before navigating away.

## Next phases
1. Add a server-side GitHub write integration with a safely stored secret or GitHub App installation token and SHA conflict detection. The publishing button must not ship until source control writing and deployment verification are tested.
2. Build a preview screen and tracked draft-vs-published diffs.
3. Convert facts/stops JSON to structured repeatable fields, add photo selection.
4. Native editors for home status, Where to Next, and past postcards.
5. Retire Decap/Turbo only when feature parity and migrations are verified.

## Source-backed checks
- All 24 published JSON paths exist under the expected data folder.
- JS syntax checks passed for the API, editor, dashboard and owner route.
- Simulated API confirmed: unauthorized GET returns 404, initial GET no draft, POST saves, index reports saved day, subsequent GET loads draft, mismatched day rejected, and DELETE removes draft.
- This release has not had a live Cloudflare deployment or Owner browser validation yet.

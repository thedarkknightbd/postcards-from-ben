# Native Postcard Preview & Publish — rollout

## Status
The new private journal studio implements **Save Draft → Preview → Publish Postcard** for both:
- All 24 day JSON files in `trips/the-long-way-around/data/day-XX.json`
- The five existing trip-level `trips/<slug>/postcard.json` files

**Publishing remains disabled until Cloudflare Pages Production has the secret `GITHUB_PUBLISH_TOKEN`.** No token value is committed or rendered in the website.

## How to enable the GitHub publisher safely

1. In GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens, create a token scoped to **only** the `thedarkknightbd/postcards-from-ben` repository. Use repository **Contents: Read and write**, with Metadata Read (automatic); avoid Administration, Secrets, Actions, or other broad permissions. Choose a limited expiration and plan to rotate it.
2. In Cloudflare → Workers & Pages → Pages project **postcards-from-ben** → Settings → Variables and secrets → **Production**, add a **Secret** (encrypted text) named **`GITHUB_PUBLISH_TOKEN`** and paste the token **only there**, never in site code, email, screenshots, or this chat. It is a **Pages secret**, not a Worker secret for `postcards-live-location`.
3. Save and trigger a new Pages production deployment if Cloudflare requires it to attach the runtime secret. Do not add the publishing secret to Preview.
4. Reload `https://postcardsfromben.com/admin/journals/` under the existing Owner login. The journal editor should permit Preview and then Publish for a valid private draft.
5. Start with a minor, reversible wording change to one postcard. Save draft → Preview → Publish → confirm. The backend writes a commit to the repository `main` branch; verify the GitHub commit and Cloudflare production deployment before considering the public page updated.

## Safeguards
- `/api/admin/publish` requires an approved Owner session, production **postcardsfromben.com** hostname, correct same-origin header for POST, allowlisted source paths, explicit `PUBLISH` confirmation and a saved draft.
- Server uses GitHub REST Contents API; no browser exposure of the token, raw file update request, or new public endpoint.
- First private-draft save records the exact GitHub blob SHA it was based on and rejects a stale starting version. Subsequent saves retain that SHA.
- Publish requires that the saved draft's SHA equals the currently fetched GitHub main-branch blob SHA. GitHub also checks the SHA during PUT. If a conflict occurs, no update is made; reload and reconcile.
- Private drafts created **before this feature** have no baseline SHA and cannot publish automatically. Download or preserve their text, discard the old draft, reload the current published source, and create a new draft to establish a safe baseline.
- Preview uses text-only DOM insertion, without HTML interpretation; it approximates the written postcard content, **not a pixel-perfect public page with photos, map and layout**.
- After GitHub commit the UI reports the commit and warns that Cloudflare may still be deploying. Draft is marked `published_pending_deploy` (no auto-claim that production is live). Existing Decap/Turbo remains operational as fallback.
- If the secret is missing, the UI remains functional for private drafts and preview but disables Publish.

## Tested
- Syntax validation passed for modified Pages Functions and editor JavaScript.
- Draft save rejected a missing first baseline (409) and saved successfully with an authentic matching SHA (200).
- Simulated publishing denied anonymous users, cross-origin POST, and missing configuration; rejected a stale GitHub file (409); accepted a valid saved draft; and returned conflict on a simulated GitHub 409.
- **Not yet live-verified:** GitHub credential setup, real GitHub API writes, Cloudflare deployment, and the final public rendered page. Use a harmless initial edit.

## Rollback
Remove the `GITHUB_PUBLISH_TOKEN` secret from Pages Production to disable publishing immediately; private drafts and legacy CMS remain. Any already committed content can be reverted using GitHub history. Do not copy token into Pages Preview or the public repository.

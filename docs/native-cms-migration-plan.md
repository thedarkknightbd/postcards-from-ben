# Unified CMS migration — phase 1 inventory

The existing Decap/Turbo editor stays operational at `/admin/editor/` until replacement edit + publish flows are fully tested. The unified dashboard is `/admin/`.

## Existing editable content (from `admin/config.yml`)
- Homepage: `data/home-adventure.json`
- Future destinations: `data/where-to-next.json`
- The Long Way Around daily content: `trips/the-long-way-around/data/` (existing JSON entries, `create: false`).
- Past Postcards: five `trips/<slug>/postcard.json` files.
- Public media: existing `/admin/media.html` and R2.
- Beyond the Postcard: existing owner/private gallery tools.

## Native editor priorities
1. Owner-only journal/day index with clear published/draft status, day labels, and entry links.
2. Structured day editor that matches the current 20 fields; fetch content safely from versioned GitHub source.
3. Protected server-side GitHub write connector: never put a repository write token in the browser or client JavaScript. Use conflict detection (current SHA) before writes.
4. Draft, preview, publish flow with a visible audit of which commit/deployment contains each change.
5. Homepage and future-adventure editing.
6. Past Postcards editing and unified media chooser; remove Decap/Turbo only after parity verification.

## Design
Keep current navy, Carolina blue and cream dashboard. Shared authenticated nav across CMS pages, clear return-to-dashboard, iPad-first controls. Preserve existing content paths and JSON schema to avoid site migrations.

No GitHub write token or secret has been added by this planning file. Phase 1 inventory is not a completed native CMS editor.

# Homepage Management — Native Admin

The owner-only editor is at `/admin/homepage/` and replaces the dashboard's Site Settings tile as the primary entry point. It edits the same two JSON files used by the public homepage and legacy CMS:

- **Adventure Status**: `data/home-adventure.json` — between/traveling/upcoming, current and upcoming adventure title, description, and path.
- **Where to Next?**: `data/where-to-next.json` — introduction and up to 15 editable, reorderable destination cards.

## Drafts and publish
- Owner-only `/api/admin/homepage?section=adventure-status|where-to-next` uses the existing session and `PRIVATE_MEDIA` R2.
- Draft R2 keys: `internal/cms-drafts/homepage/adventure-status.json` and `internal/cms-drafts/homepage/where-to-next.json`.
- New drafts require the GitHub blob SHA of the published source. Subsequent saves retain their initial baseline.
- Preview displays text without interpreting HTML; it is a content preview, not an exact visual homepage preview.
- Publish checks production custom domain, same-origin request, token, explicit confirmation, valid content, saved draft and source SHA, then commits via existing server-side `readGithub`/`writeGithub` helpers.
- A successful commit marks draft `published_pending_deploy` without asserting Cloudflare production deployment.
- The repository credential is never sent to the client; `GITHUB_PUBLISH_TOKEN` must remain a Production secret.
- No existing data files, R2 media, or live public markup are modified in this feature. Decap remains available during migration.

## Validation
- Syntax checks passed for API, admin UI, and route.
- Mocked owner authorization: nonowner 404; initial GET success; missing baseline rejected; valid save and subsequent GET succeeded; cross-origin publish rejected; publish made exactly one GitHub write; repeat publish rejected.
- Browser validation is still required: owner load, editing of both sections, destination reorder, private draft restore, preview, publish, Cloudflare build, public homepage update.
- Avoid changing public homepage data for testing until preview and confirmation show intended changes.

## Photo Management — next
Existing `/admin/media.html` already supports public R2 upload, bulk editing and PHOTO_DB tagging, and `/beyond-the-postcard/` handles private galleries. Next phase should consolidate the presentation as **Adventure → Day or Album → Photos**, retaining existing storage and permission boundaries. Do not expose `MEDIA_UPLOAD_TOKEN` or private media to unapproved members.

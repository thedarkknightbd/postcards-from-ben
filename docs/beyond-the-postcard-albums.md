# Beyond the Postcard — nested album structure

## Purpose
The existing private collection is for trusted friends. Only the owner may upload or organize photos. Approved private members are read-only. No changes to public photo storage or location sharing.

## Example hierarchy (not pre-created; the owner decides what to publish)
- Bethel Visits
  - Germany — Selters
    - Bethel Life
    - Never Alone
    - Bible Exhibit — God's Light in Germany
    - Printery (optional)
  - Netherlands
  - Hungary
  - Slovakia
  - Slovenia
  - Croatia
- Special Moments
- Friends Along the Way

These are examples, not mandatory categories. Parent/child albums can be added from the site owner controls, at any depth. Real trip photos are not automatically uploaded.

## Implementation
- Album index stored as private R2 object `internal/album-index-v1.json`, inside the existing `PRIVATE_MEDIA` binding (no new D1 or Cloudflare binding).
- `GET /api/private-albums`: only approved private members/owner, returns nested album index.
- `POST /api/private-albums`: owner only, same-origin request, validates title/collection/parent and adds a child album.
- `GET /api/private-photos?collection=...&album=<id>`: returns only image keys at the selected level; legacy existing collection-root images continue working.
- `POST /api/private-photos`: owner-only photo upload into currently selected album.
- `GET /api/private-image`: signed-in private members only, supports both original and nested private keys.
- No public R2 URLs or anonymous album index.

## Release conditions
- The owner should test creating a placeholder Bethel Visits / Germany — Selters / Exhibit album path, then upload one NON-SENSITIVE image and view it at the correct depth.
- Check normal Safari signed in, and Private Browsing denied for page AND direct image and album APIs.
- Check approved ordinary (public/location) members are denied, approved private members can browse but cannot post.
- Confirm direct R2 URL cannot serve an image.
- Verify old collection-root images still appear in the right place if any exist.
- Production-only tests acceptable per owner preference; do not upload sensitive photos until authorization checks pass.

## Limitations
- No editing, deleting or reordering albums yet; no image captions or cover selection in this release.
- Album index updates currently use read-modify-write on one R2 object; serialize owner actions. A future D1 catalog with atomic writes is recommended before multi-admin support.
- Being authorized cannot prevent a visitor from saving or forwarding a photo.

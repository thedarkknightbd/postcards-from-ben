# Beyond the Postcard — Folder and Bulk Photo Management

## Owner-only folder actions
- Rename an album without moving or rewriting original photos.
- Move an album within its existing top-level collection by changing its `parentId`. Its subalbums remain associated with it; photo object keys use opaque album IDs and remain unchanged.
- Delete an album **only if there are no child albums and no photo objects beneath its ID prefix**. This never deletes photos implicitly.
- Prevent cycles (moving an album under itself or one of its descendants) and duplicate sibling album names.

## Owner-only bulk actions
- Select individual photos or all photos visible in the current album.
- Set shared Country, Visit, Exhibit and/or Location on the selected photos, preserving all other fields including captions, dates, camera technical data and GPS data.
- Move selected photos to a chosen album/subalbum.
- Each change uses existing private photo manage endpoint with owner authentication and same-origin checks; processed sequentially to avoid oversized requests and display completed/failed counts.
- No bulk delete in this iteration: irreversible actions require per-image confirmation.

## Permissions and privacy
- Only server-authenticated site owner can modify albums or photos. Private friends can only view folders/photos. Anonymous and Location-only roles cannot access private content.
- Does not add public R2 URLs or affect public photo library, OwnTracks worker, or PHOTO_DB.

## Acceptance tests
- An empty test folder can be renamed/moved/deleted; sibling duplicate rename rejected.
- A folder with at least one photo or a subfolder cannot be deleted; cycle moves rejected.
- A Private member cannot call PATCH /api/private-albums, nor modify /api/private-photo-manage.
- Bulk edit updates only supplied nonempty fields; values like unique captions and EXIF remain unchanged.
- Bulk move to another nested album preserves metadata and bytes; original album no longer lists moved photo.
- Reopen on Safari to verify owner controls, selection checkboxes, and no friend-facing management controls.
- Do not upload or modify sensitive content until real production permission test with a non-owner Private account.

**Development validation**: JS parsing and key UI IDs verified against HTML; simulated owner, rename, cycle rejection and safe delete tested. Production workflow still requires browser verification.

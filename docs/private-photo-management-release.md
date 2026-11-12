# Beyond the Postcard — photo management and metadata

Private photos stay in `PRIVATE_MEDIA`, without any public domain. No public PHOTO_DB records or public CDN URLs are created.

## Owner capabilities (draft)
- Open any photo and inspect recorded metadata.
- Edit title, caption/story, accessibility description, original filename (display only), date/time, location, country, visit, exhibit, camera make/model, lens, software, aperture, shutter speed, ISO, focal length, coordinates, altitude, and timezone.
- Move a photo to any existing gallery or nested album; original bytes and metadata retained.
- Delete a photo permanently with a confirmation prompt; its private metadata record is deleted too.

## Member capabilities
- Approved **Private** members can open a photo and see its story and metadata, but cannot edit, move or delete. Public or Location-only visitors cannot access the page, image or management endpoint.

## Metadata capture
- Original file retained unchanged.
- New JPEG uploads attempt to extract embedded EXIF camera, capture date/time, lens, ISO, exposure, GPS coordinates/altitude, and pixel dimensions.
- All formats record original filename, MIME type, file size, and upload timestamp.
- PNG/WebP/AVIF embedded EXIF and XMP metadata are not yet parsed automatically, and missing GPS or other tags are never invented.
- Existing previously uploaded private images will need a metadata backfill; they can be edited manually in this release.
- GPS coordinates are sensitive. Currently metadata is visible to all approved Private members (not visitors), so treat the approval list carefully. Consider optional location redaction before sharing.
- The input accepts descriptive date/time as source data, not a verified timezone. No coordinates are inferred.

## Release / acceptance checks
1. Owner uploads a harmless JPEG with known EXIF and checks camera, capture time, GPS, altitude, file name, MIME, size, image data; compare with source photo rather than assuming all EXIF tags exist.
2. Owner edits title/caption/location, reloads Safari, and sees the edits.
3. Owner moves photo between nested albums; old gallery no longer shows it; original bytes and metadata remain.
4. Owner deletes a harmless image, confirms it cannot be fetched through the image API or R2 private object key, and its metadata is gone.
5. Anonymous, Public, and Location-only sessions cannot GET or POST `/api/private-photo-manage`. Approved Private can GET but POST returns 404.
6. Cross-origin POST and attempts to manage a public R2 object key fail.
7. Confirm no direct private bucket URL, no cache leakage, no public photo library/Travel Atlas indexing.
8. Test Safari iPad/iPhone UI and failure cases (metadata write rollback, move failure).
9. Run JPEG parser tests against known little-endian and big-endian EXIF samples; malformed EXIF must not block upload.
10. Do not upload personal/sensitive photos until tests pass.

**Status: DRAFT / UNTESTED.** Do not merge into production until EXIF parser, R2 write/move/delete, and authorization tests are verified. There is no recycle bin; deletion is permanent.

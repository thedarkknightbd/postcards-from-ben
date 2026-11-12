# Existing Photo Metadata Scan — safe rollout

## Scope
- Public R2 binding `POSTCARDS_MEDIA`, prefix `trips/`: read image headers and fill missing EXIF fields in existing `PHOTO_DB.photos` rows. For unindexed public images, create a metadata row without moving files or changing site pages.
- Private R2 binding `PRIVATE_MEDIA`, prefix `albums/`: read image headers and fill missing fields in per-photo metadata sidecars.
- No public-facing photo indexing of private keys. No changes to `LOCATION_DB`, OwnTracks, live-location worker, public images, or private R2 bucket permissions.

## Operations
- Owner-only dashboard: `/admin/photo-scan/`.
- Owner-only POST: `/api/photo-scan` (`library=public|private`, optional continuation `cursor`).
- 10 R2 objects per request, using range-read of up to 256 KiB of JPEG headers.
- Scans start only when the owner presses a button. The owner's Safari tab must remain open. Re-running is safe; previously populated values are never overwritten.
- Displays scanned count, JPEG EXIF found, partial (no readable JPEG EXIF), skipped, and errors.
- Data written to existing public D1 or private R2 metadata sidecars, not image bytes.

## Metadata available
- For original JPEGs with valid EXIF: date taken, camera, lens, exposure, dimensions, GPS, altitude if present and if the source parser can extract it.
- Other original image formats (including iPhone HEIC) can be enumerated and basic file metadata indexed, but embedded EXIF extraction is **not yet implemented**. Do not claim otherwise.
- Missing metadata cannot be recovered from renamed/conversion-stripped images; original filename is not guessed for UUID-based private uploads.

## Review & acceptance
1. Existing caption, alt text, album, journal/day, feature status and owner edits are preserved.
2. One known EXIF-equipped JPEG backfills known fields without modifying object bytes.
3. One JPEG with no EXIF produces a partial result without fabricated date/GPS.
4. One PNG/WebP/AVIF/HEIC records basic metadata without claiming an EXIF extraction.
5. Owner only: anonymous/private/location members cannot POST scanner endpoint or access scanner page.
6. CSRF: cross-origin POST rejected.
7. Both buckets scanned separately; no public API exposes private sidecar content.
8. Repeat scan does not duplicate or overwrite existing photo entries.
9. Browser can stop scan between batches; failures count, original photos intact.
10. Confirm Cloudflare build, iPad Safari access, and D1 schema compatibility before declaring production scan completed.

## Limits
- The endpoint does not execute scheduled/background work. Owner must start it from signed-in Safari.
- Batch progress is in browser memory. Closing the tab loses the current cursor; restarting resamples from the beginning but retains already extracted fields.
- 256 KiB header read means some unusually large EXIF/XMP structures can be missed.
- The scanner does not alter existing image objects and does not automatically remove embedded GPS from images shared to Private members.
- No public-page photo metadata is presented by this scanner; owner receives counts only.

# Beyond the Postcard — private collection release gate

## What is built
- New protected /beyond-the-postcard/ page with Special Moments, Bethel Visits, and Friends Along the Way.
- Private photo listing at GET /api/private-photos?collection=...
- Private photo bytes at GET /api/private-image?key=...
- Owner-only upload at POST /api/private-photos.
- All requests require approved `private` membership or the approved site owner, using existing ACCESS_DB and existing session cookies.
- Images are stored only in a separate Cloudflare R2 binding `PRIVATE_MEDIA`, never on photos.postcardsfromben.com.
- No new login/account database and no changes to existing public R2 bucket or live-location service.

## Required production setup — do not deploy without it
- Bind existing R2 bucket `postcards-private-media` under variable name `PRIVATE_MEDIA` in the **production** Cloudflare Pages project.
- Bucket must have **no custom domain** and **public development URL disabled**.
- Keep `POSTCARDS_MEDIA` binding for the public travel site unchanged.

## Required real-production acceptance tests
1. Log out (Private Browsing) and confirm /beyond-the-postcard/ and both /api/private-* endpoints return 404 with no image data.
2. Owner: approved email login, page loads, empty album loads, upload one NON-SENSITIVE test JPEG, retrieve it only via the signed-in /api/private-image route.
3. Owner upload rejection: unsupported type, malformed image, file >12MB, no session, and cross-origin POST all fail.
4. Approved public/location user: private page/API and upload all denied.
5. Approved private user: can list/view gallery, cannot upload; revoke account and retest denial.
6. Verify uploaded test photo has no reachable photos.postcardsfromben.com URL and bucket has no public hostname.
7. Check R2 permissions, cache-control and direct API responses; verify private image not cached by Cloudflare, browser/shared CDN, or public caches.
8. Confirm public gallery/travel images work exactly as before.
9. Review browser and application logs for credentials, coordinates, or image bytes; no private data should leak.
10. Confirm album load on iPhone/iPad Safari and safe rollback; then add real sensitive photos.

## Important limits
Access protection cannot prevent approved friends from saving or forwarding photographs. Gallery listing currently caps at 300 objects per collection; implement pagination before exceeding that. This release does not automatically import any Apple Photos content.

## Release status
**DRAFT — NOT TESTED**. Do not merge or upload sensitive personal photographs before the production bucket binding and all permission tests are verified.

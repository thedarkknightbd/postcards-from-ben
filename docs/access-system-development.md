# Postcards from Ben — private access system (development only)

## Agreed permissions
- `public`: public website and public photos, no private coordinates.
- `location`: public + live location (only while owner switch is on) + travel history (separate owner switch).
- `private`: location + private galleries.
These labels are **internal only**; never send permission labels to the visitor UI.

## Signup and login
- Public visitors can request access; an email verification code verifies ownership, not approval.
- Owner manually approves and assigns permission. Approval persists across devices.
- Per-browser 30-day HTTP-only Secure SameSite=Lax sessions, stored as hashes; reauthentication via code or passkey.
- Passkeys use WebAuthn RP ID tied to final domain, after verified email enrollment; email code remains fallback.
- Never send raw codes, tokens, or secrets to logs or analytics.
- Rate-limit signup, code sends, and code verification; lock out challenge after a small attempt budget.
- Permission changes/revocation must take effect on next server request (look up current user state), not only on session creation.
- Owner authentication must be separate and strong. Do not expose a client-controlled permission or approval endpoint.

## Privacy and infrastructure
- Use separate `ACCESS_DB` for development; do not mutate production `PHOTO_DB` or `LOCATION_DB`.
- Owner-only live-location switch defaults OFF, history switch defaults OFF; optional expiry is enforced server-side.
- With live sharing OFF, return neither current nor last-known coordinates. Do not leak coordinates through HTML, map tiles, metadata, caching, EXIF, or unprotected APIs.
- Private R2 photos need authenticated proxy delivery or signed short-lived URLs; public R2 URLs cannot enforce private access.
- Audit existing /api/r2 GET listing, photo-library endpoints, location APIs, and any independent OwnTracks Worker before launch.
- Email delivery provider and DNS configuration are pending. Do not claim email codes work until tested end-to-end.
- Apply migrations/access/0001_access_schema.sql only to dev ACCESS_DB.
- Keep production Media Manager and production tagging uninterrupted.

## Implementation phases
1. Schema and threat-model audit (this commit).
2. Code delivery + request/verify endpoints with server-side throttling and hashed challenges.
3. Owner approval and permission dashboard.
4. Sessions and WebAuthn passkeys with email fallback.
5. Private photo and location authorization across every serving endpoint.
6. Integration tests and security review before production launch.

## Launch gate
No production deployment of access controls until protected assets cannot be reached anonymously, approval flow works, revocation is immediate, and owner confirms deployment.

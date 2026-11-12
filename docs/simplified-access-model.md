# Simplified access model — release checks

## Intent
The public website remains accessible without a login. There is no "approved public visitor" membership tier in the owner dashboard.

- `pending`: unapproved request, stored internally with the legacy `public` placeholder.
- `approved/private`: Beyond the Postcard gallery access only, no location access.
- `approved/location`: eligible for future location-sharing controls only, no private galleries.
- `owner`: server-recognized approved owner email, not an assignable permission.
- `revoked`: no active authenticated access even with an existing session.

## Scope
- Owner account-management dropdown offers only Private or Location.
- The server refuses creation of new `approved/public` memberships.
- Existing pending and legacy public records are not modified.
- Private and Location scope checks are independent in the shared server-side helper and `/api/access/me`.
- Existing live-location sharing remains disabled, no Location Worker or KV updates.
- The existing photo authentication and R2 bindings remain unchanged.

## Acceptance
1. Owner remains authenticated and can load the dashboard; owner row is non-editable.
2. Pending request can be approved as Private. Private member can view Beyond the Postcard, but cannot upload or access owner admin APIs.
3. Pending request can be approved as Location. Location member cannot access Beyond the Postcard.
4. Neither Private nor Location can access owner dashboard/admin-users API.
5. Unauthenticated visitor still sees normal public site; private page/API return 404.
6. Revoked account immediately loses session-backed private/location rights.
7. Direct POST to admin-users cannot set approved/public; cross-site POST is rejected.
8. Location remains disabled and unreadable even to a Location member until an explicit future release.
9. If an existing approved/public account exists, owner can change it to Private/Location or revoke it; it is not automatically upgraded.

Production database and accounts do not require migration. Perform real permission tests using a non-owner account before declaring fully verified.

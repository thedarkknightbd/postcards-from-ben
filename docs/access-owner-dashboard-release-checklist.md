# Owner access dashboard — isolated release checklist

## Scope
This draft includes only the owner dashboard, its session gate, user approval/revocation API, and owner sign-in redirect. It does **not** add the private-photo index, gallery routes, location proxy, or enable public live location. Do not merge the old consolidated access branch (#6) as part of this release.

## Existing infrastructure to verify before release
- The production Pages project has `ACCESS_DB`, `ACCESS_SESSION_SECRET`, `RESEND_API_KEY`, and `ACCESS_EMAIL_FROM` bound in **production**.
- The D1 schema contains `access_users`, `access_sessions`, `access_email_challenges`, and `access_audit`; the owner user is `approved` and uses the expected owner email.
- Cloudflare Pages Functions routes work in preview and production. A successful authenticated sign-in creates an HttpOnly Secure SameSite=Lax cookie.
- One-time codes are verified, rate-limited, cannot be reused, and expire. Existing request-code rate controls are limited per account, so review abuse protection at edge before opening registration widely.

## Acceptance tests
1. As a logged-out visitor, `/admin/access` is not accessible and `GET /api/access/admin-users` returns unauthorized without account data.
2. A regular approved user can sign in but cannot load admin pages or APIs.
3. The approved owner signs in through `/access/` and reaches `/admin/access` (desktop and iPhone).
4. Pending users can be listed, approved with the intended permission, then appear under Approved. An approved account can be revoked.
5. An existing revoked user's session is rejected on the next protected request.
6. Attempts to modify the owner's account are denied, including direct API requests.
7. Admin POST rejects missing/cross-origin Origin headers; GET cannot mutate state.
8. All owner pages and protected API responses have no-store caching.
9. D1 writes and audit records are correct; rollback plan is confirmed.
10. Public travel pages remain unaffected and the direct location Worker still denies unauthenticated GET.

## Known blockers
- The connected GitHub repository does not prove Cloudflare production bindings or live D1 account state.
- No production sign-in or role-boundary test has been executed from this branch.
- **Do not merge until the tests above pass.** Access features require a functional review, not just a code review.

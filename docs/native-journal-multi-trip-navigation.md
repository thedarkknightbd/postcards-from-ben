# Native journal studio: Trip → Day / Overview → Postcard

The native editor now begins with a **Choose an adventure** dropdown.

- **The Long Way Around:** 24 existing daily JSON files. Choose a day, then edit the existing `intro` field, labeled **Today's Postcard**. The current `/api/admin/journal?day=XX` draft API and its existing private R2 keys are unchanged.
- **Winter on the Black Sea**, **Autumn in Hungary**, **A Special Convention**, **Under the Mara Sky**, and **An Afternoon with Giants:** one adventure-level postcard each, sourced from the existing `trips/<slug>/postcard.json`. No fake day-by-day entries or unsupported recollections are created.
- The trip-overview editor uses `story`, `kicker`, `subtitle`, `introTitle`, and the existing remaining postcard fields. All original fields are preserved on private-draft save.
- New owner-only `/api/admin/trip-draft?trip=<slug>` stores private drafts in existing `PRIVATE_MEDIA` R2 under `internal/cms-drafts/past-adventures/<slug>.json`; trip slugs are explicitly allowlisted.
- Public content stays unchanged. No GitHub publishing credential is exposed or installed; Decap/Turbo remain the publishing workflow.

## Verification
- Exact five legacy `postcard.json` files and five published adventure pages were found.
- JS syntax check passed for the revised editor.
- Simulated API: anonymous denied (404), private draft save/read/discard succeed, unrecognized slugs rejected.
- Live owner testing required after deployment: select The Long Way Around, choose a day, then switch to each older trip and verify editing; save and discard a draft; verify published pages unchanged.

## Next
Add a single owner-only publish flow with SHA-conflict detection and previews. After that, optionally add daily entries within older adventures where there is enough documented content to justify them.

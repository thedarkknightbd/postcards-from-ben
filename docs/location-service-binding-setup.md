# Internal Cloudflare service binding for private location

The public `workers.dev` address was unreachable from the deployed Pages Function (the Owner diagnostic showed anonymous `connection_error`). This change prefers an **internal Cloudflare service binding** and keeps the old public URL as a fallback until configured.

## Production Cloudflare dashboard action

1. Open **Workers & Pages** → the Pages project **postcards-from-ben**.
2. Open **Settings** → **Bindings**, choose **Production**.
3. Choose **Add binding** → **Service binding**.
4. Variable/binding name: `LOCATION_WORKER`.
5. Target Service: `postcards-live-location`.
6. Save and **redeploy** the Pages project; a new deployment is needed for the binding.
7. Keep the Pages secret `LOCATION_READ_TOKEN` configured (never post or screenshot its value).
8. Open `https://postcardsfromben.com/location/` as the site Owner and tap **Test Worker connection**.

Expected: `Connection: internal Cloudflare service binding`. Anonymous GET must return denied (401/403/404). Authenticated GET should return a valid latest position. If authenticated GET returns 401/403, the Pages and Worker read tokens differ. If 404, verify the Worker's `/location` route. If no usable position, verify the latest KV point and supported Worker envelope. **Do not turn on sharing until the test passes.**

## Security

- The service binding is server-side only; the Worker token and coordinates are never included in diagnostic responses.
- All location reads still require an active website Owner or Location session plus a private sharing flag set to ON.
- Enabling remains gated behind both denied anonymous request and valid authenticated location, via the same service binding.
- This change does not change or redeploy the underlying Worker; OwnTracks POST ingestion, LIVE_LOCATION KV and LOCATION_HISTORY D1 are untouched.
- Turning site sharing OFF prevents reads through Pages but does not disable OwnTracks collection or invalidate a separately known direct Worker read token.
- After verifying the binding in production, the public URL fallback can be removed for stricter topology.

Reference: Cloudflare Pages Functions service bindings documentation: https://developers.cloudflare.com/pages/functions/bindings/

# Page photo metadata inventory

This is a **read-only** report of photographs explicitly referenced by website source files. It does not extract EXIF, change R2 objects, update D1, or touch live location.

## Run

Node.js 20+:

```sh
MEDIA_UPLOAD_TOKEN="(your existing Media Manager token)" GITHUB_TOKEN="(GitHub token if required)" node scripts/inventory-page-photo-metadata.mjs
```

Outputs `photo-metadata-report/inventory.csv` and `inventory.json` locally. **Never commit or publish the output**, because it may contain precise GPS coordinates. The script reads GitHub source and queries the existing authenticated `/api/photo-metadata` endpoint for each referenced R2 key.

## Coverage limitations

This captures explicit R2 image references in HTML/JS/JSON/Markdown, including trip-day pages. Images selected only at runtime via `/api/r2`, CMS content not committed to GitHub, and generated URLs may not be discoverable statically. Missing records remain missing; no fabricated time, GPS, altitude or camera values. The report's counts represent discovered references, not necessarily every photo visibly rendered on the live website. The API may return HTTP 503 if PHOTO_DB is unbound, or HTTP 401 if the supplied token is incorrect.

No production changes or credentials are required in GitHub itself to prepare the script.

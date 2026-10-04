const IMAGE_RE = /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i;

const PAST_TRIP_SLUGS = new Set([
  "winter-on-the-black-sea",
  "autumn-in-hungary",
  "a-special-convention",
  "under-the-mara-sky",
  "an-afternoon-with-giants"
]);

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.POSTCARDS_MEDIA) {
    return new Response("Media storage is not configured.", {
      status: 500
    });
  }

  const url = new URL(request.url);
  const key = sanitizeKey(
    url.searchParams.get("key") || ""
  );

  if (!isAllowedImageKey(key)) {
    return new Response("Invalid photo.", {
      status: 400
    });
  }

  const object =
    await env.POSTCARDS_MEDIA.get(key);

  if (!object) {
    return new Response("Photo not found.", {
      status: 404
    });
  }

  const filename =
    key.split("/").pop() || "photo";

  const headers =
    new Headers();

  object.writeHttpMetadata(headers);

  headers.set(
    "content-disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
  );

  headers.set(
    "cache-control",
    "private, max-age=0"
  );

  return new Response(
    object.body,
    { headers }
  );
}

function isAllowedImageKey(key) {
  if (!IMAGE_RE.test(key)) {
    return false;
  }

  if (
    /^trips\/the-long-way-around\/(hero\/|days\/day-(0[1-9]|1[0-9]|2[0-4])\/)[^/]+$/.test(key)
  ) {
    return true;
  }

  const match =
    key.match(
      /^trips\/([^/]+)\/(hero|gallery)\/[^/]+$/
    );

  return Boolean(
    match &&
    PAST_TRIP_SLUGS.has(match[1])
  );
}

function sanitizeKey(value) {
  return value
    .replace(/^\/+/, "")
    .replace(/\.\./g, "")
    .replace(/\/+/g, "/");
}

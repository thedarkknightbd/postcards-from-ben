const IMAGE_RE = /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i;
const VIDEO_RE = /\.mp4$/i;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MAX_VIDEO_PARTS = 20;

const PAST_TRIP_SLUGS = new Set([
  "winter-on-the-black-sea",
  "autumn-in-hungary",
  "a-special-convention",
  "under-the-mara-sky",
  "an-afternoon-with-giants"
]);

export async function onRequest(context) {
  const { request, env } = context;

  if (!env.POSTCARDS_MEDIA) {
    return json({ error: "R2 binding POSTCARDS_MEDIA is not configured." }, 500);
  }

  const auth = request.headers.get("Authorization") || "";
  const expected = env.MEDIA_UPLOAD_TOKEN ? `Bearer ${env.MEDIA_UPLOAD_TOKEN}` : "";
  const isAuthorized = Boolean(expected && auth === expected);
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";

  if (request.method === "GET") {
    const prefix = sanitizePrefix(url.searchParams.get("prefix") || "");

    if (!isMediaFolder(prefix)) {
      return json({ error: "Invalid media folder." }, 400);
    }

    const objects = await listMedia(env, prefix);
    const ordered = await applySavedOrder(env, prefix, objects);

    return json({
      prefix,
      type: mediaTypeForPrefix(prefix),
      objects: ordered.map(toPublicObject.bind(null, env))
    });
  }

  if (!isAuthorized) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (action === "video-start" && request.method === "POST") {
    return startVideoUpload(request, env);
  }

  if (action === "video-part" && request.method === "PUT") {
    return uploadVideoPart(request, env, url);
  }

  if (action === "video-complete" && request.method === "POST") {
    return completeVideoUpload(request, env);
  }

  if (action === "video-abort" && request.method === "DELETE") {
    return abortVideoUpload(env, url);
  }

  if (request.method === "POST") {
    const form = await request.formData();
    const file = form.get("file");
    const prefix = sanitizePrefix(String(form.get("prefix") || ""));

    if (!isPhotoFolder(prefix)) {
      return json({ error: "Invalid photo upload folder." }, 400);
    }

    if (!(file instanceof File)) {
      return json({ error: "No file supplied." }, 400);
    }

    if (!file.type.startsWith("image/") || !IMAGE_RE.test(file.name || "")) {
      return json({ error: "Only image uploads are allowed here." }, 400);
    }

    const existing = await applySavedOrder(
      env,
      prefix,
      await listMedia(env, prefix)
    );

    const safeName = makeSafeName(file.name || "photo.jpg", "photo");
    const key = `${prefix}${Date.now()}-${safeName}`;

    await env.POSTCARDS_MEDIA.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: { originalName: file.name || safeName }
    });

    await saveOrder(
      env,
      prefix,
      [...existing.map(item => item.key), key]
    );

    return json({
      ok: true,
      key,
      url: publicUrl(env, key)
    });
  }

  if (request.method === "PUT") {
    let body;

    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body." }, 400);
    }

    const prefix = sanitizePrefix(String(body.prefix || ""));
    const requestedKeys = Array.isArray(body.keys)
      ? body.keys.map(String)
      : [];

    if (!isMediaFolder(prefix)) {
      return json({ error: "Invalid media folder." }, 400);
    }

    const current = await applySavedOrder(
      env,
      prefix,
      await listMedia(env, prefix)
    );

    const existingKeys = new Set(current.map(item => item.key));
    const ordered = [];
    const seen = new Set();

    for (const key of requestedKeys) {
      if (existingKeys.has(key) && !seen.has(key)) {
        ordered.push(key);
        seen.add(key);
      }
    }

    for (const item of current) {
      if (!seen.has(item.key)) {
        ordered.push(item.key);
      }
    }

    await saveOrder(env, prefix, ordered);

    return json({
      ok: true,
      prefix,
      keys: ordered
    });
  }

  if (request.method === "DELETE") {
    const key = sanitizeKey(url.searchParams.get("key") || "");
    const slash = key.lastIndexOf("/");

    if (slash < 0) {
      return json({ error: "Invalid object key." }, 400);
    }

    const prefix = key.slice(0, slash + 1);

    if (
      !isMediaFolder(prefix) ||
      !allowedExtensionForPrefix(prefix).test(key)
    ) {
      return json({ error: "Invalid object key." }, 400);
    }

    await env.POSTCARDS_MEDIA.delete(key);

    const current = await applySavedOrder(
      env,
      prefix,
      await listMedia(env, prefix)
    );

    await saveOrder(
      env,
      prefix,
      current.map(item => item.key)
    );

    return json({ ok: true, key });
  }

  return json({ error: "Method not allowed." }, 405);
}

async function startVideoUpload(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const prefix = sanitizePrefix(String(body.prefix || ""));
  const name = String(body.name || "video.mp4");
  const size = Number(body.size);
  const type = String(body.type || "video/mp4");

  if (!isVideoFolder(prefix)) {
    return json({ error: "Invalid video folder." }, 400);
  }

  if (!VIDEO_RE.test(name)) {
    return json({ error: "Videos must be MP4 files." }, 400);
  }

  if (!Number.isFinite(size) || size <= 0 || size > MAX_VIDEO_BYTES) {
    return json({ error: "Video must be 500 MB or smaller." }, 400);
  }

  if (type && type !== "video/mp4" && type !== "application/mp4") {
    return json({ error: "Videos must use the MP4 format." }, 400);
  }

  const existing = await applySavedOrder(
    env,
    prefix,
    await listMedia(env, prefix)
  );

  const safeName = makeSafeName(name, "video");
  const key = `${prefix}${Date.now()}-${safeName}`;

  const upload = await env.POSTCARDS_MEDIA.createMultipartUpload(key, {
    httpMetadata: { contentType: "video/mp4" },
    customMetadata: {
      originalName: name,
      declaredSize: String(size)
    }
  });

  return json({
    ok: true,
    key: upload.key,
    uploadId: upload.uploadId,
    existingKeys: existing.map(item => item.key),
    maxBytes: MAX_VIDEO_BYTES
  });
}

async function uploadVideoPart(request, env, url) {
  const key = sanitizeKey(url.searchParams.get("key") || "");
  const uploadId = String(url.searchParams.get("uploadId") || "");
  const partNumber = Number(url.searchParams.get("partNumber"));

  if (!isVideoKey(key) || !uploadId) {
    return json({ error: "Invalid video upload." }, 400);
  }

  if (
    !Number.isInteger(partNumber) ||
    partNumber < 1 ||
    partNumber > MAX_VIDEO_PARTS
  ) {
    return json({ error: "Invalid video part number." }, 400);
  }

  if (!request.body) {
    return json({ error: "Missing video part." }, 400);
  }

  const upload = env.POSTCARDS_MEDIA.resumeMultipartUpload(key, uploadId);

  try {
    const part = await upload.uploadPart(partNumber, request.body);
    return json({
      ok: true,
      partNumber: part.partNumber,
      etag: part.etag
    });
  } catch (error) {
    return json({ error: error?.message || "Video part upload failed." }, 400);
  }
}

async function completeVideoUpload(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const key = sanitizeKey(String(body.key || ""));
  const uploadId = String(body.uploadId || "");
  const parts = Array.isArray(body.parts) ? body.parts : [];

  if (!isVideoKey(key) || !uploadId || !parts.length) {
    return json({ error: "Invalid video completion request." }, 400);
  }

  if (parts.length > MAX_VIDEO_PARTS) {
    return json({ error: "Video has too many parts." }, 400);
  }

  const upload = env.POSTCARDS_MEDIA.resumeMultipartUpload(key, uploadId);

  try {
    await upload.complete(
      parts.map(part => ({
        partNumber: Number(part.partNumber),
        etag: String(part.etag)
      }))
    );
  } catch (error) {
    return json({ error: error?.message || "Could not complete video upload." }, 400);
  }

  const object = await env.POSTCARDS_MEDIA.head(key);

  if (!object || object.size > MAX_VIDEO_BYTES) {
    await env.POSTCARDS_MEDIA.delete(key);
    return json({ error: "Video exceeds the 500 MB limit." }, 400);
  }

  const slash = key.lastIndexOf("/");
  const prefix = key.slice(0, slash + 1);

  const current = await applySavedOrder(
    env,
    prefix,
    await listMedia(env, prefix)
  );

  await saveOrder(
    env,
    prefix,
    current.map(item => item.key)
  );

  return json({
    ok: true,
    key,
    url: publicUrl(env, key),
    size: object.size
  });
}

async function abortVideoUpload(env, url) {
  const key = sanitizeKey(url.searchParams.get("key") || "");
  const uploadId = String(url.searchParams.get("uploadId") || "");

  if (!isVideoKey(key) || !uploadId) {
    return json({ error: "Invalid video upload." }, 400);
  }

  try {
    const upload = env.POSTCARDS_MEDIA.resumeMultipartUpload(key, uploadId);
    await upload.abort();
  } catch {
    // The upload may already have expired or been completed.
  }

  return json({ ok: true });
}

function isPhotoFolder(prefix) {
  if (prefix === "trips/the-long-way-around/hero/") {
    return true;
  }

  if (
    /^trips\/the-long-way-around\/days\/day-(0[1-9]|1[0-9]|2[0-4])\/$/.test(prefix)
  ) {
    return true;
  }

  const match = prefix.match(/^trips\/([^/]+)\/(hero|gallery)\/$/);

  return Boolean(match && PAST_TRIP_SLUGS.has(match[1]));
}

function isVideoFolder(prefix) {
  if (
    /^trips\/the-long-way-around\/days\/day-(0[1-9]|1[0-9]|2[0-4])\/videos\/$/.test(prefix)
  ) {
    return true;
  }

  const match = prefix.match(/^trips\/([^/]+)\/videos\/$/);

  return Boolean(match && PAST_TRIP_SLUGS.has(match[1]));
}

function isMediaFolder(prefix) {
  return isPhotoFolder(prefix) || isVideoFolder(prefix);
}

function mediaTypeForPrefix(prefix) {
  return isVideoFolder(prefix) ? "video" : "image";
}

function allowedExtensionForPrefix(prefix) {
  return isVideoFolder(prefix) ? VIDEO_RE : IMAGE_RE;
}

function isVideoKey(key) {
  const slash = key.lastIndexOf("/");

  if (slash < 0 || !VIDEO_RE.test(key)) {
    return false;
  }

  return isVideoFolder(key.slice(0, slash + 1));
}

async function listMedia(env, prefix) {
  const objects = [];
  let cursor;
  const allowed = allowedExtensionForPrefix(prefix);

  do {
    const listed = await env.POSTCARDS_MEDIA.list({
      prefix,
      limit: 1000,
      cursor
    });

    objects.push(
      ...listed.objects.filter(item => {
        if (!allowed.test(item.key)) {
          return false;
        }

        const remainder = item.key.slice(prefix.length);
        return remainder && !remainder.includes("/");
      })
    );

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return objects;
}

async function applySavedOrder(env, prefix, objects) {
  const order = await loadOrder(env, prefix);
  const positions = new Map(order.map((key, index) => [key, index]));

  return [...objects].sort((a, b) => {
    const ai = positions.has(a.key)
      ? positions.get(a.key)
      : Number.MAX_SAFE_INTEGER;

    const bi = positions.has(b.key)
      ? positions.get(b.key)
      : Number.MAX_SAFE_INTEGER;

    if (ai !== bi) {
      return ai - bi;
    }

    const at = a.uploaded ? new Date(a.uploaded).getTime() : 0;
    const bt = b.uploaded ? new Date(b.uploaded).getTime() : 0;

    return at - bt || a.key.localeCompare(b.key);
  });
}

async function loadOrder(env, prefix) {
  const object = await env.POSTCARDS_MEDIA.get(orderKey(prefix));

  if (!object) {
    return [];
  }

  try {
    const parsed = JSON.parse(await object.text());

    return Array.isArray(parsed)
      ? parsed.filter(value => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

async function saveOrder(env, prefix, keys) {
  await env.POSTCARDS_MEDIA.put(
    orderKey(prefix),
    JSON.stringify(keys),
    {
      httpMetadata: {
        contentType: "application/json"
      }
    }
  );
}

function orderKey(prefix) {
  return `${prefix}_order.json`;
}

function toPublicObject(env, obj) {
  return {
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded,
    url: publicUrl(env, obj.key)
  };
}

function sanitizePrefix(value) {
  return value
    .replace(/^\/+/, "")
    .replace(/\.\./g, "")
    .replace(/\/+/g, "/")
    .replace(/\/?$/, "/");
}

function sanitizeKey(value) {
  return value
    .replace(/^\/+/, "")
    .replace(/\.\./g, "")
    .replace(/\/+/g, "/");
}

function makeSafeName(name, fallback = "media") {
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot > -1 ? name.slice(lastDot).toLowerCase() : "";
  const base = lastDot > -1 ? name.slice(0, lastDot) : name;

  return (
    base
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 80) ||
    fallback
  ) + ext;
}

function publicUrl(env, key) {
  const base = (
    env.MEDIA_PUBLIC_BASE_URL ||
    "https://photos.postcardsfromben.com"
  ).replace(/\/$/, "");

  return (
    `${base}/` +
    key
      .split("/")
      .map(encodeURIComponent)
      .join("/")
  );
}

function json(body, status = 200) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    }
  );
}

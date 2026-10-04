const IMAGE_RE = /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i;

export async function onRequest(context) {
  const { request, env } = context;

  if (!env.POSTCARDS_MEDIA) {
    return json({ error: "R2 binding POSTCARDS_MEDIA is not configured." }, 500);
  }

  const auth = request.headers.get("Authorization") || "";
  const expected = env.MEDIA_UPLOAD_TOKEN ? `Bearer ${env.MEDIA_UPLOAD_TOKEN}` : "";
  const isAuthorized = Boolean(expected && auth === expected);
  const url = new URL(request.url);

  if (request.method === "GET") {
    const prefix = sanitizePrefix(url.searchParams.get("prefix") || "");

    if (!isMediaFolder(prefix)) {
      return json({ error: "Invalid media folder." }, 400);
    }

    const objects = await listImages(env, prefix);
    const ordered = await applySavedOrder(env, prefix, objects);

    return json({
      prefix,
      objects: ordered.map(toPublicObject.bind(null, env))
    });
  }

  if (!isAuthorized) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (request.method === "POST") {
    const form = await request.formData();
    const file = form.get("file");
    const prefix = sanitizePrefix(String(form.get("prefix") || ""));

    if (!isMediaFolder(prefix)) {
      return json({ error: "Invalid upload folder." }, 400);
    }

    if (!(file instanceof File)) {
      return json({ error: "No file supplied." }, 400);
    }

    if (!file.type.startsWith("image/")) {
      return json({ error: "Only image uploads are allowed." }, 400);
    }

    const existing = await applySavedOrder(env, prefix, await listImages(env, prefix));
    const safeName = makeSafeName(file.name || "photo");
    const key = `${prefix}${Date.now()}-${safeName}`;

    await env.POSTCARDS_MEDIA.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalName: file.name || safeName }
    });

    await saveOrder(env, prefix, [...existing.map(item => item.key), key]);

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
    const requestedKeys = Array.isArray(body.keys) ? body.keys.map(String) : [];

    if (!isMediaFolder(prefix)) {
      return json({ error: "Invalid media folder." }, 400);
    }

    const current = await applySavedOrder(env, prefix, await listImages(env, prefix));
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

    return json({ ok: true, prefix, keys: ordered });
  }

  if (request.method === "DELETE") {
    const key = sanitizeKey(url.searchParams.get("key") || "");
    const slash = key.lastIndexOf("/");

    if (slash < 0) {
      return json({ error: "Invalid object key." }, 400);
    }

    const prefix = key.slice(0, slash + 1);

    if (!isMediaFolder(prefix) || !IMAGE_RE.test(key)) {
      return json({ error: "Invalid object key." }, 400);
    }

    await env.POSTCARDS_MEDIA.delete(key);

    const current = await applySavedOrder(env, prefix, await listImages(env, prefix));
    await saveOrder(env, prefix, current.map(item => item.key));

    return json({ ok: true, key });
  }

  return json({ error: "Method not allowed." }, 405);
}

function isMediaFolder(prefix) {
  const pastTrip =
    "(winter-on-the-black-sea|autumn-in-hungary|a-special-convention|under-the-mara-sky|an-afternoon-with-giants)";

  return (
    prefix === "trips/the-long-way-around/hero/" ||
    /^trips\/the-long-way-around\/days\/day-(0[1-9]|1[0-9]|2[0-4])\/$/.test(prefix) ||
    new RegExp(`^trips/${pastTrip}/(hero|gallery)/const IMAGE_RE = /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i;

export async function onRequest(context) {
  const { request, env } = context;

  if (!env.POSTCARDS_MEDIA) {
    return json({ error: "R2 binding POSTCARDS_MEDIA is not configured." }, 500);
  }

  const auth = request.headers.get("Authorization") || "";
  const expected = env.MEDIA_UPLOAD_TOKEN ? `Bearer ${env.MEDIA_UPLOAD_TOKEN}` : "";
  const isAuthorized = Boolean(expected && auth === expected);
  const url = new URL(request.url);

  if (request.method === "GET") {
    const prefix = sanitizePrefix(url.searchParams.get("prefix") || "");

    if (!isMediaFolder(prefix)) {
      return json({ error: "Invalid media folder." }, 400);
    }

    const objects = await listImages(env, prefix);
    const ordered = await applySavedOrder(env, prefix, objects);

    return json({
      prefix,
      objects: ordered.map(toPublicObject.bind(null, env))
    });
  }

  if (!isAuthorized) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (request.method === "POST") {
    const form = await request.formData();
    const file = form.get("file");
    const prefix = sanitizePrefix(String(form.get("prefix") || ""));

    if (!isMediaFolder(prefix)) {
      return json({ error: "Invalid upload folder." }, 400);
    }

    if (!(file instanceof File)) {
      return json({ error: "No file supplied." }, 400);
    }

    if (!file.type.startsWith("image/")) {
      return json({ error: "Only image uploads are allowed." }, 400);
    }

    const existing = await applySavedOrder(env, prefix, await listImages(env, prefix));
    const safeName = makeSafeName(file.name || "photo");
    const key = `${prefix}${Date.now()}-${safeName}`;

    await env.POSTCARDS_MEDIA.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalName: file.name || safeName }
    });

    await saveOrder(env, prefix, [...existing.map(item => item.key), key]);

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
    const requestedKeys = Array.isArray(body.keys) ? body.keys.map(String) : [];

    if (!isMediaFolder(prefix)) {
      return json({ error: "Invalid media folder." }, 400);
    }

    const current = await applySavedOrder(env, prefix, await listImages(env, prefix));
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

    return json({ ok: true, prefix, keys: ordered });
  }

  if (request.method === "DELETE") {
    const key = sanitizeKey(url.searchParams.get("key") || "");
    const slash = key.lastIndexOf("/");

    if (slash < 0) {
      return json({ error: "Invalid object key." }, 400);
    }

    const prefix = key.slice(0, slash + 1);

    if (!isMediaFolder(prefix) || !IMAGE_RE.test(key)) {
      return json({ error: "Invalid object key." }, 400);
    }

    await env.POSTCARDS_MEDIA.delete(key);

    const current = await applySavedOrder(env, prefix, await listImages(env, prefix));
    await saveOrder(env, prefix, current.map(item => item.key));

    return json({ ok: true, key });
  }

  return json({ error: "Method not allowed." }, 405);
}

).test(prefix)
  );
}

async function listImages(env, prefix) {
  const objects = [];
  let cursor;

  do {
    const listed = await env.POSTCARDS_MEDIA.list({
      prefix,
      limit: 1000,
      cursor
    });

    objects.push(...listed.objects.filter(item => IMAGE_RE.test(item.key)));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return objects;
}

async function applySavedOrder(env, prefix, objects) {
  const order = await loadOrder(env, prefix);
  const positions = new Map(order.map((key, index) => [key, index]));

  return [...objects].sort((a, b) => {
    const ai = positions.has(a.key) ? positions.get(a.key) : Number.MAX_SAFE_INTEGER;
    const bi = positions.has(b.key) ? positions.get(b.key) : Number.MAX_SAFE_INTEGER;

    if (ai !== bi) return ai - bi;

    const at = a.uploaded ? new Date(a.uploaded).getTime() : 0;
    const bt = b.uploaded ? new Date(b.uploaded).getTime() : 0;

    return at - bt || a.key.localeCompare(b.key);
  });
}

async function loadOrder(env, prefix) {
  const object = await env.POSTCARDS_MEDIA.get(orderKey(prefix));

  if (!object) return [];

  try {
    const parsed = JSON.parse(await object.text());
    return Array.isArray(parsed) ? parsed.filter(value => typeof value === "string") : [];
  } catch {
    return [];
  }
}

async function saveOrder(env, prefix, keys) {
  await env.POSTCARDS_MEDIA.put(
    orderKey(prefix),
    JSON.stringify(keys),
    { httpMetadata: { contentType: "application/json" } }
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

function makeSafeName(name) {
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot > -1 ? name.slice(lastDot).toLowerCase() : "";
  const base = lastDot > -1 ? name.slice(0, lastDot) : name;

  return (
    base
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 80) || "photo"
  ) + ext;
}

function publicUrl(env, key) {
  const base = (env.MEDIA_PUBLIC_BASE_URL || "https://photos.postcardsfromben.com").replace(/\/$/, "");
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

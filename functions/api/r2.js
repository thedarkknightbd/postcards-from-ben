export async function onRequest(context) {
  const { request, env } = context;

  if (!env.POSTCARDS_MEDIA) {
    return json({ error: "R2 binding POSTCARDS_MEDIA is not configured." }, 500);
  }

  const auth = request.headers.get("Authorization") || "";
  const expected = env.MEDIA_UPLOAD_TOKEN ? `Bearer ${env.MEDIA_UPLOAD_TOKEN}` : "";

  if (!expected || auth !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  const url = new URL(request.url);

  if (request.method === "GET") {
    const prefix = sanitizePrefix(url.searchParams.get("prefix") || "trips/the-long-way-around/");
    const listed = await env.POSTCARDS_MEDIA.list({ prefix, limit: 1000 });

    return json({
      prefix,
      objects: listed.objects.map((obj) => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        url: publicUrl(env, obj.key)
      }))
    });
  }

  if (request.method === "POST") {
    const form = await request.formData();
    const file = form.get("file");
    const prefix = sanitizePrefix(String(form.get("prefix") || ""));

    if (!(file instanceof File)) {
      return json({ error: "No file supplied." }, 400);
    }

    if (!prefix.startsWith("trips/the-long-way-around/")) {
      return json({ error: "Invalid upload prefix." }, 400);
    }

    if (!file.type.startsWith("image/")) {
      return json({ error: "Only image uploads are allowed." }, 400);
    }

    const safeName = makeSafeName(file.name || "photo");
    const key = `${prefix.replace(/\/+$/, "")}/${Date.now()}-${safeName}`;

    await env.POSTCARDS_MEDIA.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalName: file.name || safeName }
    });

    return json({
      ok: true,
      key,
      url: publicUrl(env, key)
    });
  }

  return json({ error: "Method not allowed." }, 405);
}

function sanitizePrefix(value) {
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

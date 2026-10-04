export async function onRequestGet(context) {
  const { env, request } = context;

  if (!env.POSTCARDS_MEDIA) {
    return json({ error: "R2 binding POSTCARDS_MEDIA is not configured." }, 500);
  }

  const url = new URL(request.url);
  const rawDay = String(url.searchParams.get("day") || "").trim();
  const dayNumber = Number(rawDay);

  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 24) {
    return json({ error: "Invalid day." }, 400);
  }

  const day = String(dayNumber).padStart(2, "0");
  const prefix = `trips/the-long-way-around/days/day-${day}/`;

  const objects = [];
  let cursor;

  do {
    const listed = await env.POSTCARDS_MEDIA.list({
      prefix,
      limit: 1000,
      cursor
    });

    objects.push(
      ...listed.objects.filter(obj =>
        /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i.test(obj.key)
      )
    );

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  objects.sort((a, b) => {
    const aTime = a.uploaded ? new Date(a.uploaded).getTime() : 0;
    const bTime = b.uploaded ? new Date(b.uploaded).getTime() : 0;
    return aTime - bTime || a.key.localeCompare(b.key);
  });

  return json({
    day: dayNumber,
    prefix,
    photos: objects.map(obj => ({
      file: publicUrl(env, obj.key),
      key: obj.key
    }))
  });
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
      "cache-control": "public, max-age=60"
    }
  });
}

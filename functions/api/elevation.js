export async function onRequestGet({ request, env }) {
  const day = Number(new URL(request.url).searchParams.get("day"));

  if (!Number.isInteger(day) || day < 1 || day > 24) {
    return respond({ error: "Invalid day" }, 400);
  }

  if (!env.LOCATION_DB) {
    return respond({ error: "Database binding unavailable" }, 503);
  }

  const date = new Date(Date.UTC(2026, 9, 18 + day))
    .toISOString().slice(0, 10);

  const nextDate = new Date(
    Date.parse(date + "T00:00:00Z") + 86400000
  ).toISOString().slice(0, 10);

  const midnight = d =>
    Date.parse(d + "T00:00:00Z") / 1000 -
    (d <= "2026-10-25" ? 7200 : 3600);

  const start = midnight(date);
  const end = midnight(nextDate);

  const base = {
    day,
    date,
    timeZone: "Europe/Vienna",
    startTimestamp: start,
    dayMinutes: (end - start) / 60
  };

  // Keep current-day movement private until local midnight.
  if (Date.now() / 1000 < end) {
    return respond({ ...base, status: "recording", points: [] });
  }

  try {
    let rebuilt = [];

    try {
      const result = await env.LOCATION_DB.prepare(`
        SELECT minute, meters, timing, note
        FROM reconstructed_elevation
        WHERE trip_day = ?
        ORDER BY minute
      `).bind(date).all();

      rebuilt = result.results || [];
    } catch (error) {
      if (!String(error).includes("no such table")) throw error;
    }

    if (rebuilt.length) {
      return respond({
        ...base,
        status: "reconstructed",
        source: "route_estimate",
        elevationSource: "EU-DEM 25m via Open Topo Data",
        attribution:
          "OpenStreetMap contributors; EU-DEM via Open Topo Data",
        points: rebuilt.map(p => ({
          minute: Number(p.minute),
          meters: Number(p.meters),
          samples: 0,
          estimated: true,
          timing: p.timing,
          note: p.note || ""
        }))
      });
    }

    const result = await env.LOCATION_DB.prepare(`
      SELECT
        CAST(timestamp / 300 AS INTEGER) * 300 AS bucket,
        ROUND(AVG(elevation)) AS meters,
        COUNT(*) AS samples
      FROM location_history
      WHERE timestamp >= ? AND timestamp < ?
        AND elevation > 0
        AND (vertical_accuracy IS NULL OR vertical_accuracy <= 50)
      GROUP BY CAST(timestamp / 300 AS INTEGER)
      ORDER BY bucket
    `).bind(start, end).all();

    const points = (result.results || []).map(p => ({
      minute: Math.round((p.bucket - start) / 60),
      meters: Number(p.meters),
      samples: Number(p.samples),
      estimated: false
    }));

    return respond({
      ...base,
      status: points.length ? "recorded" : "unavailable",
      source: "gps",
      points
    });
  } catch (error) {
    return respond({ error: "Elevation data unavailable" }, 503);
  }
}

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

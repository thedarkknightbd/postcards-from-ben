// Delayed, aggregate-only elevation API for Postcards from Ben.
export async function onRequestGet({ request, env }) {
  const day = Number(new URL(request.url).searchParams.get("day"));
  if (!Number.isInteger(day) || day < 1 || day > 24) {
    return respond({ error: "Invalid day" }, 400);
  }
  if (!env.LOCATION_DB) return respond({ error: "Database binding unavailable" }, 503);

  const date = new Date(Date.UTC(2026, 9, 18 + day)).toISOString().slice(0, 10);
// European daylight saving ended on October 25, 2026.
// Midnight October 25 was still UTC+2.
function localMidnight(dayDate) {
  const offsetHours = dayDate <= "2026-10-25" ? 2 : 1;
  return Date.parse(dayDate + "T00:00:00Z") / 1000
    - offsetHours * 3600;
}

const nextDate = new Date(
  Date.parse(date + "T00:00:00Z") + 86400000
).toISOString().slice(0, 10);

const start = localMidnight(date);
const end = localMidnight(nextDate);

  // No public movement updates until the local day has ended.
  if (Date.now() / 1000 < end) {
    return respond({ day, date, status: "recording", points: [] });
  }

  try {
    const query = `
      SELECT CAST(timestamp / 300 AS INTEGER) * 300 AS bucket,
             ROUND(AVG(elevation)) AS meters,
             COUNT(*) AS samples
      FROM location_history
      WHERE timestamp >= ? AND timestamp < ?
        AND elevation > 0
        AND (vertical_accuracy IS NULL OR vertical_accuracy <= 50)
      GROUP BY CAST(timestamp / 300 AS INTEGER)
      ORDER BY bucket
    `;
    const data = await env.LOCATION_DB.prepare(query).bind(start, end).all();
    const points = (data.results || []).map(row => ({
      minute: Math.round((row.bucket - start) / 60),
      meters: Number(row.meters),
      samples: Number(row.samples)
    }));
    return respond({ day, date, status: points.length ? "recorded" : "unavailable", points });
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

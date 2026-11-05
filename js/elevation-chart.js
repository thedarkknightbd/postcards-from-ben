(async function () {
  const root = document.getElementById("day-elevation");
  if (!root) return;

  const day = Number(
    root.dataset.elevationDay ||
    root.dataset.day ||
    location.pathname.match(/\/day-(\d+)(?:\.html)?\/?$/)?.[1]
  );
  if (!Number.isInteger(day) || day < 1 || day > 24) return;

  root.innerHTML =
    "<h2>Elevation Profile</h2><p>Loading elevations…</p>";

  try {
    const response = await fetch("/api/elevation?day=" + day);
    if (!response.ok) throw Error("Unavailable");

    const data = await response.json();
    const timeZone = data.timeZone || "Europe/Vienna";
    const localClock = new Intl.DateTimeFormat("en-GB", {
      timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    const samples = (data.points || []).filter(
      p => Number.isFinite(p.minute) && Number.isFinite(p.meters)
    ).map(p => {
      const parts = localClock.formatToParts(
        new Date((data.startTimestamp + p.minute * 60) * 1000)
      );
      const hour = Number(parts.find(v => v.type === "hour").value);
      const minute = Number(parts.find(v => v.type === "minute").value);
      return { ...p, minute: hour * 60 + minute };
    }).sort((a, b) => a.minute - b.minute);
    const windowStart = 7 * 60, windowEnd = 21 * 60;
    const atBoundary = minute => {
      const before = samples.filter(p => p.minute <= minute).at(-1);
      const after = samples.find(p => p.minute >= minute);
      if (!before) return { ...after, minute };
      if (!after || before.minute === after.minute) return { ...before, minute };
      return { ...before, minute, meters: before.meters +
        (after.meters - before.meters) *
        (minute - before.minute) / (after.minute - before.minute) };
    };
    const points = samples.length ? [
      atBoundary(windowStart),
      ...samples.filter(p => p.minute > windowStart && p.minute < windowEnd),
      atBoundary(windowEnd)
    ] : [];

    if (!points.length) {
      root.querySelector("p").textContent =
        data.status === "recording"
          ? "Recording today. Chart available after local midnight."
          : "No elevation data available.";
      return;
    }

    const estimated = data.status === "reconstructed";
    const values = points.map(p => p.meters);
    const low = Math.min(...values);
    const high = Math.max(...values);

    const W = 1000, H = 380;
    const L = 75, R = 30, T = 45, B = 75;
    const floor = Math.min(0, Math.floor(low / 200) * 200);
    const ceil = Math.ceil((high + 100) / 200) * 200;
    const span = windowEnd - windowStart;

    const x = m => L + (W - L - R) * (m - windowStart) / span;
    const y = v =>
      T + (H - T - B) * (1 - (v - floor) / (ceil - floor));

    // Smooth curves without inventing peaks between samples.
    const nodes = points.map(p => [x(p.minute), y(p.meters)]);
    const sec = nodes.slice(1).map(
      (p, i) => (p[1] - nodes[i][1]) / (p[0] - nodes[i][0])
    );

    const slopes = nodes.map((_, i) => {
      if (i === 0 || i === nodes.length - 1) return 0;
      if (sec[i - 1] * sec[i] <= 0) return 0;

      const h0 = nodes[i][0] - nodes[i - 1][0];
      const h1 = nodes[i + 1][0] - nodes[i][0];

      return 3 * (h0 + h1) /
        ((2 * h1 + h0) / sec[i - 1] +
         (h1 + 2 * h0) / sec[i]);
    });

    let path = "M" + nodes[0].join(" ");

    for (let i = 1; i < nodes.length; i++) {
      const [a, b] = nodes[i - 1];
      const [c, d] = nodes[i];
      const h = (c - a) / 3;

      path += day === 16 && estimated ? ` L${c} ${d}` : ` C${a + h} ${b + slopes[i - 1] * h}
        ${c - h} ${d - slopes[i] * h} ${c} ${d}`;
    }

    const clock = m => {
      const hour = Math.floor(m / 60);
      return (hour % 12 || 12) + ":00 " + (hour < 12 ? "AM" : "PM");
    };

    let ticks = "";
    for (let m = windowStart; m <= windowEnd; m += 120) {
      ticks += `<text x="${x(m)}" y="337"
        text-anchor="middle" font-size="13"
        fill="#20364a">${clock(m)}</text>`;
    }

    let grid = "";
    for (let v = floor; v <= ceil; v += 200) {
      grid += `<path d="M${L} ${y(v)}H${W - R}"
        stroke="#d4dce2"/>
        <text x="65" y="${y(v) + 4}"
        text-anchor="end" font-size="13"
        fill="#20364a">${v}</text>`;
    }

    const label = estimated
      ? "ESTIMATED ELEVATION"
      : "RECORDED ELEVATION";

    const footnote = estimated && day === 16
      ? "Reconstructed from traveler-reported cable-car times and elevations, with a road profile adapted from the following day’s GPS readings. Fuel-stop elevation and road timing are approximate; intermediate points are interpolated."
      : estimated
      ? "Reconstructed road route and terrain elevations. Intermediate times are estimated; hotel arrival is approximate. OpenStreetMap contributors; EU-DEM via Open Topo Data."
      : "Five-minute GPS averages, subject to GPS accuracy.";

    root.innerHTML = `
      <div class="elevation-postcard">
        <p class="section-kicker">DAY ${day} · ${label}</p>
        <h2>Elevation Profile</h2>
        <p>${data.date}</p>

        <div class="elevation-stats">
          <div>Start<strong>${points[0].meters} m</strong></div>
          <div>Highest<strong>${high} m</strong></div>
          <div>Lowest<strong>${low} m</strong></div>
        </div>

        <svg viewBox="0 0 ${W} ${H}" role="img"
          aria-label="Elevation over local time">
          <path d="${path}
            L${nodes.at(-1)[0]} ${y(floor)}
            L${nodes[0][0]} ${y(floor)} Z"
            fill="#c9dff2" opacity=".65"/>
          ${grid}
          <path d="${path}" fill="none"
            stroke="#164b82" stroke-width="3.5"
            stroke-linecap="round"/>
          ${ticks}
        </svg>

        <p class="elevation-footnote">
          ${footnote}
          Local time in ${data.timeZone || "Europe/Vienna"}.
        </p>
      </div>`;
  } catch (error) {
    root.innerHTML =
      "<h2>Elevation Profile</h2>" +
      "<p>Elevation data temporarily unavailable.</p>";
  }
})();

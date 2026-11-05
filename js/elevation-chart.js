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
    const points = (data.points || []).filter(
      p => Number.isFinite(p.minute) && Number.isFinite(p.meters)
    );

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
    const span = data.dayMinutes || 1440;

    const x = m => L + (W - L - R) * m / span;
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

      path += ` C${a + h} ${b + slopes[i - 1] * h}
        ${c - h} ${d - slopes[i] * h} ${c} ${d}`;
    }

    const clock = m =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: data.timeZone || "Europe/Vienna",
        hour: "numeric",
        minute: "2-digit"
      }).format(
        new Date((data.startTimestamp + m * 60) * 1000)
      );

    let ticks = "";
    for (let m = 0; m <= span; m += 120) {
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

    const footnote = estimated
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

/* Sum only recorded driving distances; rail journeys are not counted. */
(async function () {
  const milesElement = document.getElementById("trip-miles-driven");
  const kmElement = document.getElementById("trip-km-driven");
  if (!milesElement) return;
  const days = Array.from({length:24}, (_,i) => String(i+1).padStart(2,"0"));
  const responses = await Promise.allSettled(days.map(day => fetch("data/day-"+day+".json").then(r => {if (!r.ok) throw new Error("Day unavailable"); return r.json();})));
  let totalKm = 0, recorded = 0;
  for (const result of responses) {
    if (result.status !== "fulfilled") continue;
    const value = result.value.kilometersDriven;
    if (value === null || value === undefined || value === "") continue;
    const km = Number(value);
    if (!Number.isFinite(km) || km < 0) continue;
    totalKm += km;
    recorded++;
  }
  if (!recorded) { milesElement.textContent = "—"; return; }
  milesElement.textContent = Math.round(totalKm * 0.621371).toLocaleString("en-US");
  if (kmElement) kmElement.textContent = totalKm.toLocaleString("en-US") + " km recorded";
})().catch(error => console.warn("Driving odometer unavailable",error));

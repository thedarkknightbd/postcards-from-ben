// Elevation calculations from samples enriched by a terrain data provider.
// Never infer height from two-dimensional route coordinates.
export function summarizeElevation(samples, thresholdMeters = 5) {
  const valid = samples.filter(p => Number.isFinite(p.distanceMeters) && Number.isFinite(p.elevationMeters));
  if (valid.length < 2) return null;
  let ascentMeters = 0, descentMeters = 0;
  for (let i = 1; i < valid.length; i++) {
    const change = valid[i].elevationMeters - valid[i - 1].elevationMeters;
    if (change > thresholdMeters) ascentMeters += change;
    if (change < -thresholdMeters) descentMeters -= change;
  }
  return {
    minElevationMeters: Math.min(...valid.map(p => p.elevationMeters)),
    maxElevationMeters: Math.max(...valid.map(p => p.elevationMeters)),
    ascentMeters, descentMeters,
    distanceMeters: valid.at(-1).distanceMeters - valid[0].distanceMeters
  };
}

export type TemperatureType = "hot" | "cold" | "moderate";

// Documented thresholds: cold < 50°F, hot > 80°F, moderate in between.
// Pure function — no I/O, so it's trivially testable at the boundaries.
export function characterize(temp: number): TemperatureType {
  if (temp < 50) return "cold";
  if (temp > 80) return "hot";
  return "moderate";
}

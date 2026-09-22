import type { UnitsPreference } from "@/types/database";

const METRES_PER_KM = 1000;
const METRES_PER_MILE = 1609.344;

export function metresToDisplayDistance(metres: number, units: UnitsPreference): number {
  return units === "miles" ? metres / METRES_PER_MILE : metres / METRES_PER_KM;
}

export function displayDistanceToMetres(value: number, units: UnitsPreference): number {
  return units === "miles" ? value * METRES_PER_MILE : value * METRES_PER_KM;
}

export function formatDistance(metres: number, units: UnitsPreference, fractionDigits = 1): string {
  const value = metresToDisplayDistance(metres, units);
  return `${value.toFixed(fractionDigits)}${units === "miles" ? "mi" : "km"}`;
}

export function unitLabel(units: UnitsPreference): string {
  return units === "miles" ? "mi" : "km";
}

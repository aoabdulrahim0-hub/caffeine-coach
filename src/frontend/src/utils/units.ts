export const KG_TO_LBS = 2.20462;

export function toDisplay(kg: number, unit: "kg" | "lbs"): number {
  if (unit === "lbs") return Math.round(kg * KG_TO_LBS * 10) / 10;
  return Math.round(kg * 10) / 10;
}

export function toKg(val: number, unit: "kg" | "lbs"): number {
  if (unit === "lbs") return Math.round((val / KG_TO_LBS) * 10) / 10;
  return val;
}

export function formatWeight(kg: number, unit: "kg" | "lbs"): string {
  const val = toDisplay(kg, unit);
  return `${val} ${unit}`;
}

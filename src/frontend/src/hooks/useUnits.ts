import { useCallback, useState } from "react";
import { formatWeight, toDisplay, toKg } from "../utils/units";

const STORAGE_KEY = "caffeine_unit";

export function useUnits() {
  const [unit, setUnitState] = useState<"kg" | "lbs">(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "lbs" ? "lbs" : "kg";
  });

  const setUnit = useCallback((u: "kg" | "lbs") => {
    localStorage.setItem(STORAGE_KEY, u);
    setUnitState(u);
  }, []);

  return {
    unit,
    setUnit,
    toDisplay: (kg: number) => toDisplay(kg, unit),
    toKg: (val: number) => toKg(val, unit),
    formatWeight: (kg: number) => formatWeight(kg, unit),
  };
}

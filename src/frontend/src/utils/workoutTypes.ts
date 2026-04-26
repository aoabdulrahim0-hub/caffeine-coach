import type { WorkoutType } from "../types";

export function workoutTypeLabel(wt: WorkoutType): string {
  if (wt === "upper") return "Upper Body";
  if (wt === "lower") return "Lower Body";
  return "Full Body";
}

export function workoutTypeShort(wt: WorkoutType): string {
  if (wt === "upper") return "UPPER";
  if (wt === "lower") return "LOWER";
  return "FULL BODY";
}

export function workoutTypeBadgeClass(wt: WorkoutType): string {
  if (wt === "upper") return "badge-upper";
  if (wt === "lower") return "badge-lower";
  return "badge-full";
}

export const WORKOUT_TYPES: WorkoutType[] = ["upper", "lower", "fullBody"];

export function getMusclesForWorkoutType(wt: WorkoutType): string[] {
  if (wt === "upper") return ["chest", "back", "shoulders", "arms"];
  if (wt === "lower")
    return ["quads", "hamstrings", "glutes", "calves", "core"];
  return [
    "chest",
    "back",
    "shoulders",
    "arms",
    "quads",
    "hamstrings",
    "glutes",
    "calves",
    "core",
  ];
}

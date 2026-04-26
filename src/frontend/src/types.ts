// Shared frontend types — mirrors backend.d.ts with convenience aliases

export type WorkoutType = "upper" | "lower" | "fullBody";

export type ProgressionFlag = "Increase weight" | "Maintain" | "Deload";

// Candid variant enums are re-exported from backend.d.ts for convenience
export { ExperienceLevel, Gender, Goal } from "./backend.d";

export interface SmartExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  movement: string;
  sets: bigint;
  repRange: string;
  targetWeight: number;
  coachTip: string;
  progressionFlag: string;
}

export interface SetLog {
  setNumber: bigint;
  repsCompleted: bigint;
  weightUsed: number;
  rpe?: bigint;
}

export interface RejectedExercise {
  exerciseId: string;
  reason: string;
}

export interface SelectionStep {
  step: string;
  input: string;
  output: string;
}

export interface EngineTrace {
  phase: string;
  fatigueScore: bigint;
  muscleScores: Array<[string, number]>;
  selectedFocus: string[];
  rejectedExercises: RejectedExercise[];
  selectionSteps: SelectionStep[];
  finalOrderingReason: string;
}

export interface SmartMenuResult {
  workout: SmartExercise[];
  trace: EngineTrace;
}

export interface TrainingState {
  weekNumber: bigint;
  fatigueScore: bigint;
}

export interface WorkoutSession {
  timestamp: bigint;
  exercises: SmartExercise[];
  setLogs: Array<[string, SetLog[]]>;
  totalVolume: number;
  note: string;
  workoutType: string;
}

export interface PersonalBest {
  exerciseId: string;
  weight: number;
  reps: bigint;
  est1RM: number;
  achievedAt: bigint;
}

export interface ReadinessItem {
  muscleGroup: string;
  recoveryPct: bigint;
}

export interface CoachRecommendation {
  workoutType: string;
  readiness: ReadinessItem[];
  reason: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  movement: string;
}

export interface UserProfile {
  gender: import("./backend.d").Gender;
  experienceLevel: import("./backend.d").ExperienceLevel;
  bodyweightKg: number;
  restTimerSeconds: bigint;
  goal: import("./backend.d").Goal;
}

/** Candid Result<(), Text> variant */
export type LogResult =
  | { __kind__: "ok"; ok: null }
  | { __kind__: "err"; err: string };

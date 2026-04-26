import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Exercise {
    id: ExerciseId;
    movement: string;
    name: string;
    muscleGroup: MuscleGroup;
}
export interface SmartMenuResult {
    trace: EngineTrace;
    workout: Array<SmartExercise>;
}
export type Timestamp = bigint;
export interface SmartExercise {
    movement: string;
    repRange: string;
    exerciseId: ExerciseId;
    coachTip: string;
    progressionFlag: string;
    name: string;
    sets: bigint;
    muscleGroup: MuscleGroup;
    targetWeight: number;
}
export interface RejectedExercise {
    exerciseId: ExerciseId;
    reason: string;
}
export interface WorkoutSession {
    setLogs: Array<[ExerciseId, Array<SetLog>]>;
    totalVolume: number;
    note: string;
    exercises: Array<SmartExercise>;
    timestamp: Timestamp;
    workoutType: string;
}
export interface EngineTrace {
    rejectedExercises: Array<RejectedExercise>;
    selectionSteps: Array<SelectionStep>;
    fatigueScore: bigint;
    finalOrderingReason: string;
    phase: string;
    muscleScores: Array<[MuscleGroup, number]>;
    selectedFocus: Array<MuscleGroup>;
}
export interface PersonalBest {
    weight: number;
    exerciseId: ExerciseId;
    reps: bigint;
    achievedAt: Timestamp;
    est1RM: number;
}
export type MuscleGroup = string;
export interface TrainingState {
    fatigueScore: bigint;
    weekNumber: bigint;
}
export interface SelectionStep {
    output: string;
    step: string;
    input: string;
}
export interface ReadinessItem {
    recoveryPct: bigint;
    muscleGroup: MuscleGroup;
}
export interface CoachRecommendation {
    workoutType: string;
    readiness: Array<ReadinessItem>;
    reason: string;
}
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export interface SetLog {
    rpe?: bigint;
    setNumber: bigint;
    weightUsed: number;
    repsCompleted: bigint;
}
export type ExerciseId = string;
export interface UserProfile {
    experienceLevel: ExperienceLevel;
    goal: Goal;
    bodyweightKg: number;
    gender: Gender;
    restTimerSeconds: bigint;
}
export enum ExperienceLevel {
    intermediate = "intermediate",
    beginner = "beginner",
    advanced = "advanced"
}
export enum Gender {
    female = "female",
    male = "male"
}
export enum Goal {
    quick = "quick",
    strength = "strength",
    hypertrophy = "hypertrophy"
}
export interface backendInterface {
    getCoachRecommendation(): Promise<CoachRecommendation | null>;
    getExercises(): Promise<Array<Exercise>>;
    getPersonalBests(): Promise<Array<[string, PersonalBest]>>;
    getReadiness(): Promise<Array<ReadinessItem>>;
    getSmartMenu(workoutType: string): Promise<SmartMenuResult>;
    getTrainingState(): Promise<TrainingState | null>;
    getUserProfile(): Promise<UserProfile | null>;
    getWorkoutHistory(offset: bigint, limit: bigint): Promise<Array<WorkoutSession>>;
    logWorkout(session: WorkoutSession): Promise<Result>;
    setUserProfile(profile: UserProfile): Promise<void>;
}

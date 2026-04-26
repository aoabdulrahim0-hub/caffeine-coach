// types/domain.mo — all domain-specific types for the v2.4 engine
import Common "common";

module {

  // ── Exercise Library ───────────────────────────────────────────────────────
  public type Exercise = {
    id   : Common.ExerciseId;
    name : Text;
    muscleGroup : Common.MuscleGroup;
    movement : Text;
  };

  // ── User ───────────────────────────────────────────────────────────────────
  public type UserProfile = {
    gender           : Common.Gender;
    experienceLevel  : Common.ExperienceLevel;
    bodyweightKg     : Float;
    restTimerSeconds : Nat;
    goal             : Common.Goal;
  };

  // ── Training State (NEW) ───────────────────────────────────────────────────
  public type TrainingState = {
    weekNumber   : Nat;   // 1–4 cycle
    fatigueScore : Nat;
  };

  // ── Workout Logging ────────────────────────────────────────────────────────
  public type SetLog = {
    setNumber    : Nat;
    repsCompleted : Nat;
    weightUsed   : Float;
    rpe          : ?Nat;
  };

  public type WorkoutSession = {
    timestamp   : Common.Timestamp;
    exercises   : [SmartExercise];
    setLogs     : [(Common.ExerciseId, [SetLog])];  // keyed by exerciseId
    totalVolume : Float;
    note        : Text;
    workoutType : Text;  // "upper" | "lower" | "fullBody"
  };

  // ── Smart Exercise ─────────────────────────────────────────────────────────
  public type SmartExercise = {
    exerciseId      : Common.ExerciseId;
    name            : Text;
    muscleGroup     : Common.MuscleGroup;
    movement        : Text;
    sets            : Nat;
    repRange        : Text;
    targetWeight    : Float;
    coachTip        : Text;
    progressionFlag : Text;  // "Increase weight" | "Maintain" | "Deload"
  };

  // ── Engine Trace (NEW) ────────────────────────────────────────────────────
  public type RejectedExercise = {
    exerciseId : Common.ExerciseId;
    reason     : Text;
  };

  public type SelectionStep = {
    step   : Text;
    input  : Text;
    output : Text;
  };

  public type EngineTrace = {
    phase                : Text;
    fatigueScore         : Nat;
    muscleScores         : [(Common.MuscleGroup, Float)];
    selectedFocus        : [Common.MuscleGroup];
    rejectedExercises    : [RejectedExercise];
    selectionSteps       : [SelectionStep];
    finalOrderingReason  : Text;
  };

  public type SmartMenuResult = {
    workout : [SmartExercise];
    trace   : EngineTrace;
  };

  // ── Personal Best ──────────────────────────────────────────────────────────
  public type PersonalBest = {
    exerciseId  : Common.ExerciseId;
    weight      : Float;
    reps        : Nat;
    est1RM      : Float;
    achievedAt  : Common.Timestamp;
  };

  // ── Recovery ──────────────────────────────────────────────────────────────
  public type MuscleRecovery = {
    muscleGroup  : Common.MuscleGroup;
    lastTrainedAt : Common.Timestamp;
  };

  // ── Readiness / Coach ──────────────────────────────────────────────────────
  public type ReadinessItem = {
    muscleGroup  : Common.MuscleGroup;
    recoveryPct  : Nat;
  };

  public type CoachRecommendation = {
    workoutType : Text;
    reason      : Text;
    readiness   : [ReadinessItem];
  };

};

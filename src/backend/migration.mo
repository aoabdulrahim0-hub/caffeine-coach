// migration.mo — v2.4 clean-slate migration
// Consumes ALL old stable fields (constants, arrays, maps) and discards them.
// Returns fresh empty Maps for the new schema.
// Implements the "clean slate" mandate from v2.4 spec.
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {

  // ── Old types (inline, copied from .old/src/backend/main.mo) ─────────────

  type Timestamp = Int;

  type Gender = { #male; #female };
  type ExperienceLevel = { #beginner; #intermediate; #advanced };
  type WorkoutType = { #upper; #lower; #fullBody };

  type OldUserProfile = {
    gender           : Gender;
    experienceLevel  : ExperienceLevel;
    bodyweightKg     : Float;
    restTimerSeconds : Nat;
  };

  type SetData = {
    weight            : Float;
    reps              : Nat;
    rpe               : ?Nat;
    actualRestSeconds : ?Nat;
  };

  type WorkoutExercise = {
    exerciseId  : Text;
    muscleGroup : Text;
    sets        : [SetData];
  };

  type OldWorkoutSession = {
    exercises   : [WorkoutExercise];
    timestamp   : Timestamp;
    totalVolume : Float;
    note        : Text;
    workoutType : WorkoutType;
  };

  type OldPersonalBest = {
    exerciseId : Text;
    weight     : Float;
    reps       : Nat;
    est1RM     : Float;
    achievedAt : Timestamp;
  };

  type OldMuscleRecovery = {
    muscleGroup   : Text;
    lastTrainedAt : Timestamp;
    baselineHours : Nat;
  };

  type OldExercise = {
    id          : Text;
    name        : Text;
    muscleGroup : Text;
    movement    : Text;
  };

  // ── New types (mirrored from types/domain.mo) ─────────────────────────────

  type Goal = { #strength; #hypertrophy; #quick };

  type NewUserProfile = {
    gender           : Gender;
    experienceLevel  : ExperienceLevel;
    bodyweightKg     : Float;
    restTimerSeconds : Nat;
    goal             : Goal;
  };

  type SetLog = {
    setNumber     : Nat;
    repsCompleted : Nat;
    weightUsed    : Float;
    rpe           : ?Nat;
  };

  type NewSmartExercise = {
    exerciseId      : Text;
    name            : Text;
    muscleGroup     : Text;
    movement        : Text;
    sets            : Nat;
    repRange        : Text;
    targetWeight    : Float;
    coachTip        : Text;
    progressionFlag : Text;
  };

  type NewWorkoutSession = {
    timestamp   : Timestamp;
    exercises   : [NewSmartExercise];
    setLogs     : [(Text, [SetLog])];
    totalVolume : Float;
    note        : Text;
    workoutType : Text;
  };

  type NewPersonalBest = {
    exerciseId : Text;
    weight     : Float;
    reps       : Nat;
    est1RM     : Float;
    achievedAt : Timestamp;
  };

  type NewMuscleRecovery = {
    muscleGroup   : Text;
    lastTrainedAt : Timestamp;
  };

  type TrainingState = {
    weekNumber   : Nat;
    fatigueScore : Nat;
  };

  // ── Migration domain / codomain ───────────────────────────────────────────

  type OldActor = {
    // Constants that were stable in v1
    RECOVERY_HIGH  : Nat;
    RECOVERY_MED   : Nat;
    DELOAD_KG      : Float;
    EPS            : Float;
    MAX_RECOVERY   : Nat;
    MIN_BODYWEIGHT : Float;
    MAX_BODYWEIGHT : Float;
    MIN_REST       : Nat;
    MAX_REST       : Nat;
    // Arrays that were stable in v1
    exercises    : [OldExercise];
    allMuscles   : [Text];
    // Maps from v1
    users            : Map.Map<Principal, OldUserProfile>;
    sessions         : Map.Map<Principal, [OldWorkoutSession]>;
    bests            : Map.Map<Principal, Map.Map<Text, OldPersonalBest>>;
    recovery         : Map.Map<Principal, [OldMuscleRecovery]>;
    lastFocusMuscles : Map.Map<Principal, [Text]>;
  };

  type NewActor = {
    users            : Map.Map<Principal, NewUserProfile>;
    sessions         : Map.Map<Principal, [NewWorkoutSession]>;
    bests            : Map.Map<Principal, Map.Map<Text, NewPersonalBest>>;
    recovery         : Map.Map<Principal, [NewMuscleRecovery]>;
    trainingState    : Map.Map<Principal, TrainingState>;
    lastFocusMuscles : Map.Map<Principal, [Text]>;
  };

  // ── Migration function — clean slate ──────────────────────────────────────
  // All old state is consumed and discarded. New Maps start empty.
  // This is intentional: v2.4 is a fundamental engine rewrite with an
  // incompatible exercise library, scoring, and data model.
  public func run(_ : OldActor) : NewActor {
    {
      users            = Map.empty();
      sessions         = Map.empty();
      bests            = Map.empty();
      recovery         = Map.empty();
      trainingState    = Map.empty();
      lastFocusMuscles = Map.empty();
    }
  };

};

// mixins/coach-api.mo — public API surface for the v2.4 engine
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Domain "../types/domain";
import Common "../types/common";
import Engine "../lib/engine";
import Storage "../lib/storage";

// State slices injected from main.mo
mixin (
  users            : Map.Map<Principal, Domain.UserProfile>,
  sessions         : Map.Map<Principal, [Domain.WorkoutSession]>,
  bests            : Map.Map<Principal, Map.Map<Text, Domain.PersonalBest>>,
  recovery         : Map.Map<Principal, [Domain.MuscleRecovery]>,
  trainingState    : Map.Map<Principal, Domain.TrainingState>,
  lastFocusMuscles : Map.Map<Principal, [Text]>,
) {

  // ── Auth ───────────────────────────────────────────────────────────────────
  func requireAuth(caller : Principal) {
    if (caller.isAnonymous()) Runtime.trap("Unauthorized: Please log in with Internet Identity");
  };

  // ── Profile ────────────────────────────────────────────────────────────────

  public shared({ caller }) func setUserProfile(profile : Domain.UserProfile) : async () {
    requireAuth(caller);
    // Validate bounds
    if (profile.bodyweightKg < 20.0 or profile.bodyweightKg > 300.0) {
      Runtime.trap("Invalid bodyweightKg: must be between 20 and 300");
    };
    if (profile.restTimerSeconds < 30 or profile.restTimerSeconds > 600) {
      Runtime.trap("Invalid restTimerSeconds: must be between 30 and 600");
    };
    users.add(caller, profile);
  };

  public shared({ caller }) func getUserProfile() : async ?Domain.UserProfile {
    requireAuth(caller);
    users.get(caller)
  };

  // ── Training State ─────────────────────────────────────────────────────────

  public shared({ caller }) func getTrainingState() : async ?Domain.TrainingState {
    requireAuth(caller);
    trainingState.get(caller)
  };

  // ── Workout Logging ────────────────────────────────────────────────────────

  public shared({ caller }) func logWorkout(session : Domain.WorkoutSession) : async Common.Result<(), Text> {
    requireAuth(caller);
    let now : Common.Timestamp = Time.now();

    // Step 1: compute totalVolume
    let volume = Storage.computeTotalVolume(session);
    let enriched : Domain.WorkoutSession = { session with totalVolume = volume };

    // Step 2: prepend session to history (cap at 100)
    let prevHistory : [Domain.WorkoutSession] = switch (sessions.get(caller)) {
      case null  { [] };
      case (?h)  { h };
    };
    let newHistory = Storage.prependSession(prevHistory, enriched);
    sessions.add(caller, newHistory);

    // Step 3: update recovery timestamps
    let prevRecovery : [Domain.MuscleRecovery] = switch (recovery.get(caller)) {
      case null  { [] };
      case (?r)  { r };
    };
    let newRecovery = Storage.updateRecovery(
      prevRecovery, enriched, Engine.exercises, now,
      Engine.allMuscles, Engine.getBaselineHours
    );
    recovery.add(caller, newRecovery);

    // Step 4: update personal bests (atomic — single write after full loop)
    let pbMap : Map.Map<Text, Domain.PersonalBest> = switch (bests.get(caller)) {
      case null  { Map.empty() };
      case (?m)  { m };
    };
    Storage.updatePersonalBests(pbMap, enriched, now, Engine.calcEst1RM);
    bests.add(caller, pbMap);

    // Step 5: accumulate fatigueScore (+2 high-fatigue, +1 other)
    // Step 6: advance weekNumber (increment, reset to 1 if > 4)
    // Step 7: persist TrainingState
    let prevState : Domain.TrainingState = switch (trainingState.get(caller)) {
      case null  { { weekNumber = 1; fatigueScore = 0 } };
      case (?s)  { s };
    };
    let lastSessionAt : ?Common.Timestamp = if (prevHistory.size() > 0) ?prevHistory[0].timestamp else null;
    let fatigueDelta = Engine.calcFatigueDelta(enriched.exercises);
    let newState = Storage.advanceTrainingState(prevState, fatigueDelta, now, lastSessionAt);
    trainingState.add(caller, newState);

    #ok(())
  };

  // ── Smart Menu ─────────────────────────────────────────────────────────────

  public shared({ caller }) func getSmartMenu(workoutType : Text) : async Domain.SmartMenuResult {
    requireAuth(caller);
    let now : Common.Timestamp = Time.now();

    let profile : Domain.UserProfile = switch (users.get(caller)) {
      case null    { Runtime.trap("Profile not found: please set up your profile first") };
      case (?p)    { p };
    };

    let state : Domain.TrainingState = switch (trainingState.get(caller)) {
      case null  { { weekNumber = 1; fatigueScore = 0 } };
      case (?s)  { s };
    };

    let recoveryRecords : [Domain.MuscleRecovery] = switch (recovery.get(caller)) {
      case null  { [] };
      case (?r)  { r };
    };

    let pbMap : Map.Map<Text, Domain.PersonalBest> = switch (bests.get(caller)) {
      case null  { Map.empty() };
      case (?m)  { m };
    };

    let prevFocus : [Text] = switch (lastFocusMuscles.get(caller)) {
      case null  { [] };
      case (?f)  { f };
    };

    let allSessions : [Domain.WorkoutSession] = switch (sessions.get(caller)) {
      case null  { [] };
      case (?s)  { s };
    };
    let recentSessions : [Domain.WorkoutSession] = if (allSessions.size() > 3) {
      allSessions.sliceToArray(0, 3)
    } else { allSessions };

    let result = Engine.generateWorkout(
      workoutType, profile, state, recoveryRecords,
      pbMap, prevFocus, recentSessions, now
    );

    // Persist focus muscles
    lastFocusMuscles.add(caller, result.trace.selectedFocus);

    result
  };

  // ── Exercise Library ───────────────────────────────────────────────────────

  public query func getExercises() : async [Domain.Exercise] {
    Engine.exercises
  };

  // ── Personal Bests ─────────────────────────────────────────────────────────

  public shared({ caller }) func getPersonalBests() : async [(Text, Domain.PersonalBest)] {
    requireAuth(caller);
    switch (bests.get(caller)) {
      case null  { [] };
      case (?m)  { m.entries().toArray() };
    }
  };

  // ── History ────────────────────────────────────────────────────────────────

  public shared({ caller }) func getWorkoutHistory(offset : Nat, limit : Nat) : async [Domain.WorkoutSession] {
    requireAuth(caller);
    let hist : [Domain.WorkoutSession] = switch (sessions.get(caller)) {
      case null  { [] };
      case (?h)  { h };
    };
    if (offset >= hist.size()) return [];
    let end = offset + limit;
    let toExcl : Int = if (end > hist.size()) hist.size().toInt() else end.toInt();
    hist.sliceToArray(offset.toInt(), toExcl)
  };

  // ── Readiness ──────────────────────────────────────────────────────────────

  public shared({ caller }) func getReadiness() : async [Domain.ReadinessItem] {
    requireAuth(caller);
    let now : Common.Timestamp = Time.now();
    let recoveryRecords : [Domain.MuscleRecovery] = switch (recovery.get(caller)) {
      case null  { [] };
      case (?r)  { r };
    };
    Engine.buildReadiness(recoveryRecords, now)
  };

  // ── Coach Recommendation ───────────────────────────────────────────────────

  public shared({ caller }) func getCoachRecommendation() : async ?Domain.CoachRecommendation {
    requireAuth(caller);
    let now : Common.Timestamp = Time.now();
    let recoveryRecords : [Domain.MuscleRecovery] = switch (recovery.get(caller)) {
      case null  { [] };
      case (?r)  { r };
    };
    let readiness = Engine.buildReadiness(recoveryRecords, now);

    // Recommend workout type based on muscle recovery distribution
    let upperMuscles  : [Text] = ["chest", "back", "shoulders", "arms"];
    let lowerMuscles  : [Text] = ["quads", "hamstrings", "glutes", "calves", "core"];

    var upperSum : Nat = 0;
    var lowerSum : Nat = 0;

    for (item in readiness.values()) {
      if (upperMuscles.find(func(m : Text) : Bool { m == item.muscleGroup }) != null) {
        upperSum += item.recoveryPct;
      } else if (lowerMuscles.find(func(m : Text) : Bool { m == item.muscleGroup }) != null) {
        lowerSum += item.recoveryPct;
      };
    };

    let (workoutType, reason) = if (upperSum >= lowerSum) {
      ("upper", "Upper body muscles are most recovered — ideal for an upper session")
    } else {
      ("lower", "Lower body muscles are most recovered — ideal for a lower session")
    };

    ?{
      workoutType = workoutType;
      reason      = reason;
      readiness   = readiness;
    }
  };

};

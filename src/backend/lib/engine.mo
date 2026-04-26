// lib/engine.mo — pure workout generation engine logic
import Float "mo:core/Float";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Common "../types/common";
import Domain "../types/domain";

module {

  // ── Exercise Library (immutable, 34 entries) ───────────────────────────────
  public let exercises : [Domain.Exercise] = [
    { id = "bench-press";             name = "Bench Press";             muscleGroup = "chest";      movement = "horizontal-push" },
    { id = "incline-bench-press";     name = "Incline Bench Press";     muscleGroup = "chest";      movement = "horizontal-push" },
    { id = "dumbbell-bench-press";    name = "Dumbbell Bench Press";    muscleGroup = "chest";      movement = "horizontal-push" },
    { id = "incline-dumbbell-press";  name = "Incline Dumbbell Press";  muscleGroup = "chest";      movement = "horizontal-push" },
    { id = "cable-fly";               name = "Cable Fly";               muscleGroup = "chest";      movement = "isolation"       },
    { id = "chest-dips";              name = "Chest Dips";              muscleGroup = "chest";      movement = "vertical-push"   },

    { id = "barbell-row";             name = "Barbell Row";             muscleGroup = "back";       movement = "horizontal-pull" },
    { id = "dumbbell-row";            name = "Dumbbell Row";            muscleGroup = "back";       movement = "horizontal-pull" },
    { id = "seated-row";              name = "Seated Row";              muscleGroup = "back";       movement = "horizontal-pull" },
    { id = "lat-pulldown";            name = "Lat Pulldown";            muscleGroup = "back";       movement = "vertical-pull"   },
    { id = "pull-up";                 name = "Pull-Up";                 muscleGroup = "back";       movement = "vertical-pull"   },
    { id = "face-pull";               name = "Face Pull";               muscleGroup = "back";       movement = "isolation"       },

    { id = "overhead-press";          name = "Overhead Press";          muscleGroup = "shoulders";  movement = "vertical-push"   },
    { id = "dumbbell-shoulder-press"; name = "Dumbbell Shoulder Press"; muscleGroup = "shoulders";  movement = "vertical-push"   },
    { id = "lateral-raise";           name = "Lateral Raise";           muscleGroup = "shoulders";  movement = "isolation"       },
    { id = "rear-delt-fly";           name = "Rear Delt Fly";           muscleGroup = "shoulders";  movement = "isolation"       },

    { id = "barbell-curl";            name = "Barbell Curl";            muscleGroup = "arms";       movement = "isolation"       },
    { id = "dumbbell-curl";           name = "Dumbbell Curl";           muscleGroup = "arms";       movement = "isolation"       },
    { id = "hammer-curl";             name = "Hammer Curl";             muscleGroup = "arms";       movement = "isolation"       },
    { id = "tricep-pushdown";         name = "Tricep Pushdown";         muscleGroup = "arms";       movement = "isolation"       },
    { id = "skull-crusher";           name = "Skull Crusher";           muscleGroup = "arms";       movement = "isolation"       },

    { id = "plank";                   name = "Plank";                   muscleGroup = "core";       movement = "isometric"       },
    { id = "hanging-leg-raise";       name = "Hanging Leg Raise";       muscleGroup = "core";       movement = "isolation"       },
    { id = "cable-crunch";            name = "Cable Crunch";            muscleGroup = "core";       movement = "isolation"       },

    { id = "back-squat";              name = "Back Squat";              muscleGroup = "quads";      movement = "compound"        },
    { id = "front-squat";             name = "Front Squat";             muscleGroup = "quads";      movement = "compound"        },
    { id = "leg-press";               name = "Leg Press";               muscleGroup = "quads";      movement = "compound"        },
    { id = "leg-extension";           name = "Leg Extension";           muscleGroup = "quads";      movement = "isolation"       },

    { id = "romanian-deadlift";       name = "Romanian Deadlift";       muscleGroup = "hamstrings"; movement = "compound"        },
    { id = "lying-leg-curl";          name = "Lying Leg Curl";          muscleGroup = "hamstrings"; movement = "isolation"       },

    { id = "hip-thrust";              name = "Hip Thrust";              muscleGroup = "glutes";     movement = "compound"        },
    { id = "glute-bridge";            name = "Glute Bridge";            muscleGroup = "glutes";     movement = "isolation"       },

    { id = "standing-calf-raise";     name = "Standing Calf Raise";     muscleGroup = "calves";     movement = "isolation"       },
    { id = "seated-calf-raise";       name = "Seated Calf Raise";       muscleGroup = "calves";     movement = "isolation"       },
  ];

  // High-fatigue exercise IDs (max 2 per workout)
  public let highFatigueIds : [Text] = [
    "back-squat", "bench-press", "overhead-press", "barbell-row", "romanian-deadlift"
  ];

  public let allMuscles : [Text] = [
    "chest", "back", "shoulders", "arms", "core",
    "quads", "hamstrings", "glutes", "calves"
  ];

  // ── Pure helpers ───────────────────────────────────────────────────────────

  func containsText(arr : [Text], val : Text) : Bool {
    arr.find(func(x : Text) : Bool { x == val }) != null
  };

  // Recovery baseline hours per muscle group
  public func getBaselineHours(m : Text) : Nat {
    if (m == "chest" or m == "back" or m == "quads" or m == "hamstrings" or m == "glutes") {
      72
    } else if (m == "shoulders" or m == "core" or m == "calves") {
      48
    } else {
      // arms
      36
    }
  };

  // Recovery percentage [0..100]
  public func calcRecoveryPct(lastTrainedAt : Common.Timestamp, now : Common.Timestamp, baselineHours : Nat) : Nat {
    if (baselineHours == 0) return 100;
    let elapsedNs : Int = now - lastTrainedAt;
    if (elapsedNs <= 0) return 0;
    let elapsedHoursF : Float = elapsedNs.toFloat() / 3_600_000_000_000.0;
    let baseF : Float = baselineHours.toFloat();
    let pct : Float = (elapsedHoursF / baseF) * 100.0;
    let pctCapped : Float = Float.min(pct, 100.0);
    let pctInt : Int = pctCapped.toInt();
    if (pctInt <= 0) 0 else Int.abs(pctInt)
  };

  // Brzycki 1RM estimate
  public func calcEst1RM(weight : Float, reps : Nat) : Float {
    if (reps == 0 or reps > 30) return 0.0;
    weight * (36.0 / (37.0 - reps.toInt().toFloat()))
  };

  // Training phase from weekNumber (1–4 cycle)
  public func computePhase(weekNumber : Nat) : Text {
    let cycle = ((weekNumber - 1) % 4) + 1;
    if (cycle == 1 or cycle == 2) "accumulation"
    else if (cycle == 3) "intensification"
    else "deload"
  };

  // Per-muscle priority score for focus selection
  public func scoreMuscle(
    muscleGroup       : Text,
    recoveryPct       : Nat,
    hoursSinceTraining : Float,
    inRecentSessions  : Bool,
  ) : Float {
    let daysSince : Float = hoursSinceTraining / 24.0;
    let bonus : Float = if (not inRecentSessions) 10.0 else 0.0;
    (recoveryPct.toFloat() * 0.6) + (daysSince * 5.0) + bonus
  };

  // Muscles for workout type
  public func getMusclesForWorkout(workoutType : Text) : [Text] {
    if (workoutType == "upper") {
      ["chest", "back", "shoulders", "arms"]
    } else if (workoutType == "lower") {
      ["quads", "hamstrings", "glutes", "calves", "core"]
    } else {
      // fullBody
      allMuscles
    }
  };

  // Target exercise count for a muscle slot
  public func getTargetCount(
    isFocus         : Bool,
    workoutType     : Text,
    experienceLevel : Common.ExperienceLevel,
    recoveryPct     : Nat,
  ) : Nat {
    if (not isFocus) return 1;
    if (workoutType == "fullBody") {
      // base = 2, adjust for recovery
      let base : Nat = 2;
      let adjusted : Nat = if (recoveryPct < 50) {
        if (base > 1) base - 1 else 1
      } else if (recoveryPct > 85) {
        Nat.min(base + 1, 3)
      } else {
        base
      };
      adjusted
    } else {
      // upper or lower
      let base : Nat = switch (experienceLevel) {
        case (#beginner)     { 3 };
        case (#intermediate) { 3 };
        case (#advanced)     { 4 };
      };
      let adjusted : Nat = if (recoveryPct < 50) {
        if (base > 1) base - 1 else 1
      } else if (recoveryPct > 85) {
        Nat.min(base + 1, 4)
      } else {
        base
      };
      adjusted
    }
  };

  // Rep range by goal
  public func repRangeForGoal(goal : Common.Goal) : Text {
    switch (goal) {
      case (#strength)     { "3-6"   };
      case (#hypertrophy)  { "8-12"  };
      case (#quick)        { "12-15" };
    }
  };

  // Recommended sets for experience + recovery + phase
  public func recommendedSets(
    experienceLevel : Common.ExperienceLevel,
    recoveryPct     : Nat,
    phase           : Text,
  ) : Nat {
    let base : Nat = switch (experienceLevel) {
      case (#beginner)     { 3 };
      case (#intermediate) { if (recoveryPct >= 70) 4 else 3 };
      case (#advanced)     { 4 };
    };
    // Intensification: sets - 1, min 2
    if (phase == "intensification") {
      if (base > 2) base - 1 else 2
    } else {
      base
    }
  };

  // Target weight from PB and recovery
  public func targetWeight(pbWeight : Float, recoveryPct : Nat) : Float {
    if (pbWeight <= 0.0) return 20.0;
    if (recoveryPct >= 70) {
      pbWeight * 1.025
    } else if (recoveryPct >= 50) {
      pbWeight
    } else {
      let reduced = pbWeight - 2.5;
      if (reduced < 10.0) 10.0 else reduced
    }
  };

  // Deterministic coach tip from progressionFlag
  public func coachTipForFlag(progressionFlag : Text) : Text {
    if (progressionFlag == "Increase weight") {
      "Focus on strict form while increasing load"
    } else if (progressionFlag == "Deload") {
      "Reduce intensity and emphasize recovery"
    } else {
      "Prioritize controlled tempo and full range of motion"
    }
  };

  // Parse top of range from repRange string "X-Y"
  func parseRepRangeTop(repRange : Text) : Nat {
    let parts = repRange.split(#char '-');
    var top : Nat = 12;
    var idx : Nat = 0;
    for (part in parts) {
      if (idx == 1) {
        switch (Nat.fromText(part)) {
          case (?n) { top := n };
          case null {};
        };
      };
      idx += 1;
    };
    top
  };

  // Parse bottom of range from repRange string "X-Y"
  func parseRepRangeBottom(repRange : Text) : Nat {
    let parts = repRange.split(#char '-');
    var bottom : Nat = 8;
    var idx : Nat = 0;
    for (part in parts) {
      if (idx == 0) {
        switch (Nat.fromText(part)) {
          case (?n) { bottom := n };
          case null {};
        };
      };
      idx += 1;
    };
    bottom
  };

  // Progression flag from last SetLog
  public func computeProgressionFlag(
    repRange : Text,
    lastReps : ?Nat,
    lastRpe  : ?Nat,
  ) : Text {
    let top    = parseRepRangeTop(repRange);
    let bottom = parseRepRangeBottom(repRange);
    switch (lastReps) {
      case null { "Maintain" };
      case (?reps) {
        switch (lastRpe) {
          case null {
            if (reps >= top)    "Increase weight"
            else if (reps < bottom) "Deload"
            else "Maintain"
          };
          case (?rpe) {
            if (reps >= top and rpe <= 7)         "Increase weight"
            else if (reps < bottom or rpe >= 9)   "Deload"
            else "Maintain"
          };
        }
      };
    }
  };

  // Fatigue decay: subtract 3 per full 24h since last session
  public func decayFatigue(fatigueScore : Nat, lastSessionAt : ?Common.Timestamp, now : Common.Timestamp) : Nat {
    switch (lastSessionAt) {
      case null { fatigueScore };
      case (?lastAt) {
        let elapsedNs : Int = now - lastAt;
        if (elapsedNs <= 0) return fatigueScore;
        let elapsedHoursF : Float = elapsedNs.toFloat() / 3_600_000_000_000.0;
        let fullDays : Nat = (elapsedHoursF / 24.0).toInt().toNat();
        let decay : Nat = fullDays * 3;
        if (decay >= fatigueScore) 0 else fatigueScore - decay
      };
    }
  };

  // Fatigue delta for a logged session
  public func calcFatigueDelta(exs : [Domain.SmartExercise]) : Nat {
    var total : Nat = 0;
    for (ex in exs.values()) {
      if (containsText(highFatigueIds, ex.exerciseId)) { total += 2 } else { total += 1 };
    };
    total
  };

  // Build readiness array for a caller's recovery records
  public func buildReadiness(
    recoveryRecords : [Domain.MuscleRecovery],
    now             : Common.Timestamp,
  ) : [Domain.ReadinessItem] {
    allMuscles.map<Text, Domain.ReadinessItem>(func(muscle) {
      let pct = switch (recoveryRecords.find(func(r : Domain.MuscleRecovery) : Bool { r.muscleGroup == muscle })) {
        case null { 100 };
        case (?r) { calcRecoveryPct(r.lastTrainedAt, now, getBaselineHours(muscle)) };
      };
      { muscleGroup = muscle; recoveryPct = pct }
    })
  };

  // ── Workout Generation ─────────────────────────────────────────────────────

  // Build a SmartExercise from an Exercise + context
  func buildSmartExercise(
    ex              : Domain.Exercise,
    profile         : Domain.UserProfile,
    phase           : Text,
    recoveryPct     : Nat,
    pbMap           : Map.Map<Text, Domain.PersonalBest>,
    recentSessions  : [Domain.WorkoutSession],
  ) : Domain.SmartExercise {
    let repRange = repRangeForGoal(profile.goal);
    let sets     = recommendedSets(profile.experienceLevel, recoveryPct, phase);

    // Get last SetLog for progression flag
    var lastReps : ?Nat = null;
    var lastRpe  : ?Nat = null;
    label sessionLoop for (sess in recentSessions.values()) {
      for ((exId, logs) in sess.setLogs.values()) {
        if (exId == ex.id) {
          // take last set in the array
          if (logs.size() > 0) {
            let last = logs[logs.size() - 1];
            lastReps := ?last.repsCompleted;
            lastRpe  := last.rpe;
          };
          break sessionLoop;
        };
      };
    };

    let flag = computeProgressionFlag(repRange, lastReps, lastRpe);

    // PB-based weight
    let pbWeight : Float = switch (pbMap.get(ex.id)) {
      case null    { 0.0 };
      case (?pb)   { pb.weight };
    };
    var tw = targetWeight(pbWeight, recoveryPct);

    // Phase modifiers
    if (phase == "intensification") {
      tw := tw * 1.025;
    } else if (phase == "deload") {
      tw := tw * 0.8;
    };

    let tip = coachTipForFlag(flag);
    let finalFlag = if (phase == "deload") "Maintain" else flag;

    {
      exerciseId      = ex.id;
      name            = ex.name;
      muscleGroup     = ex.muscleGroup;
      movement        = ex.movement;
      sets            = sets;
      repRange        = repRange;
      targetWeight    = tw;
      coachTip        = tip;
      progressionFlag = finalFlag;
    }
  };

  // Get recovery pct for a muscle
  func getRecoveryPct(muscle : Text, recoveryRecords : [Domain.MuscleRecovery], now : Common.Timestamp) : Nat {
    switch (recoveryRecords.find(func(r : Domain.MuscleRecovery) : Bool { r.muscleGroup == muscle })) {
      case null { 100 };
      case (?r) { calcRecoveryPct(r.lastTrainedAt, now, getBaselineHours(muscle)) };
    }
  };

  // Hours since a muscle was last trained
  func hoursSinceLastTrained(muscle : Text, recoveryRecords : [Domain.MuscleRecovery], now : Common.Timestamp) : Float {
    switch (recoveryRecords.find(func(r : Domain.MuscleRecovery) : Bool { r.muscleGroup == muscle })) {
      case null { 9999.0 };
      case (?r) {
        let elapsed : Int = now - r.lastTrainedAt;
        if (elapsed <= 0) 0.0 else elapsed.toFloat() / 3_600_000_000_000.0
      };
    }
  };

  // Check if muscle appeared in last N sessions
  func muscleInRecentSessions(muscle : Text, sessions : [Domain.WorkoutSession], n : Nat) : Bool {
    var count = 0;
    var found = false;
    for (sess in sessions.values()) {
      if (count < n) {
        for (ex in sess.exercises.values()) {
          if (ex.muscleGroup == muscle) { found := true };
        };
        count += 1;
      };
    };
    found
  };

  // 4-pass selection for a muscle pool
  // Returns up to targetCount exercises, respecting global selectedIds, patternCount, fatigueCount
  func selectForMuscle(
    pool         : [Domain.Exercise],
    targetCount  : Nat,
    selectedIds  : Map.Map<Text, Bool>,
    patternCount : Map.Map<Text, Nat>,
    fatigueCount : Nat,
    pbMap        : Map.Map<Text, Domain.PersonalBest>,
    needHPull    : Bool,
    needVPull    : Bool,
    rejected     : [(Text, Text)],  // mutable accumulator (we return new list)
  ) : ([Domain.SmartExercise], [Domain.Exercise], Nat, [(Text, Text)]) {
    // We return (placeholder exercises chosen, selected exercise objects, new fatigueCount, rejections)
    // Since we can't mutate outside, we build candidates and return them
    // This helper just returns the chosen [Exercise] and updated fatigueCount + rejections
    // Actual SmartExercise construction happens in generateWorkout
    var chosen : [Domain.Exercise] = [];
    var fc = fatigueCount;
    var rej = rejected;

    func canAdd(ex : Domain.Exercise) : Bool {
      // not already selected
      switch (selectedIds.get(ex.id)) {
        case (?_) { return false };
        case null {};
      };
      // fatigue cap
      if (containsText(highFatigueIds, ex.id) and fc >= 2) {
        return false
      };
      // pattern cap (max 2), but allow override if required pull
      let isRequired = (ex.movement == "horizontal-pull" and needHPull)
                    or (ex.movement == "vertical-pull" and needVPull);
      if (not isRequired) {
        switch (patternCount.get(ex.movement)) {
          case (?c) { if (c >= 2) return false };
          case null {};
        };
      };
      true
    };

    func tryAdd(ex : Domain.Exercise) {
      if (chosen.size() < targetCount and canAdd(ex)) {
        chosen := chosen.concat([ex]);
        selectedIds.add(ex.id, true);
        // update patternCount
        let prev : Nat = switch (patternCount.get(ex.movement)) {
          case null    { 0 };
          case (?c)    { c };
        };
        patternCount.add(ex.movement, prev + 1);
        if (containsText(highFatigueIds, ex.id)) { fc += 1 };
      } else if (chosen.size() >= targetCount) {
        // already have enough — skip silently
        ()
      } else {
        // rejected due to constraints
        var reason = "constraint";
        if (switch (selectedIds.get(ex.id)) { case (?_) true; case null false }) {
          reason := "duplicate"
        } else if (containsText(highFatigueIds, ex.id) and fc >= 2) {
          reason := "fatigue-cap"
        } else {
          reason := "pattern-cap"
        };
        rej := rej.concat([(ex.id, reason)]);
      };
    };

    // Pass 1: PBs sorted by est1RM desc
    let pbPool = pool.filter(func(ex : Domain.Exercise) : Bool {
      switch (pbMap.get(ex.id)) { case (?_) true; case null false }
    });
    let pbSorted = pbPool.sort(func(a : Domain.Exercise, b : Domain.Exercise) : { #less; #equal; #greater } {
      let a1rm = switch (pbMap.get(a.id)) { case (?pb) pb.est1RM; case null 0.0 };
      let b1rm = switch (pbMap.get(b.id)) { case (?pb) pb.est1RM; case null 0.0 };
      if (a1rm > b1rm) #less else if (a1rm < b1rm) #greater else #equal
    });
    for (ex in pbSorted.values()) {
      if (chosen.size() < targetCount) tryAdd(ex);
    };

    // Pass 2: compound movements
    let compoundMovements : [Text] = ["horizontal-push", "vertical-push", "horizontal-pull", "vertical-pull", "compound"];
    let compoundPool = pool.filter(func(ex : Domain.Exercise) : Bool {
      containsText(compoundMovements, ex.movement)
      and (switch (selectedIds.get(ex.id)) { case (?_) false; case null true })
    });
    // Sort by patternCount ascending (prefer least-used patterns)
    let compoundSorted = compoundPool.sort(func(a : Domain.Exercise, b : Domain.Exercise) : { #less; #equal; #greater } {
      let ac = switch (patternCount.get(a.movement)) { case null 0; case (?c) c };
      let bc = switch (patternCount.get(b.movement)) { case null 0; case (?c) c };
      if (ac < bc) #less else if (ac > bc) #greater else Text.compare(a.id, b.id)
    });
    for (ex in compoundSorted.values()) {
      if (chosen.size() < targetCount) tryAdd(ex);
    };

    // Pass 3: isolation movements
    let isolationPool = pool.filter(func(ex : Domain.Exercise) : Bool {
      (not containsText(compoundMovements, ex.movement))
      and (switch (selectedIds.get(ex.id)) { case (?_) false; case null true })
    });
    let isolationSorted = isolationPool.sort(func(a : Domain.Exercise, b : Domain.Exercise) : { #less; #equal; #greater } {
      Text.compare(a.id, b.id)
    });
    for (ex in isolationSorted.values()) {
      if (chosen.size() < targetCount) tryAdd(ex);
    };

    // Pass 4: any remaining
    let remaining = pool.filter(func(ex : Domain.Exercise) : Bool {
      switch (selectedIds.get(ex.id)) { case (?_) false; case null true }
    });
    for (ex in remaining.values()) {
      if (chosen.size() < targetCount) tryAdd(ex);
    };

    ([], chosen, fc, rej)
  };

  // Full workout generation (deterministic)
  public func generateWorkout(
    workoutType      : Text,
    profile          : Domain.UserProfile,
    trainingState    : Domain.TrainingState,
    recoveryRecords  : [Domain.MuscleRecovery],
    pbMap            : Map.Map<Text, Domain.PersonalBest>,
    prevFocusMuscles : [Text],
    recentSessions   : [Domain.WorkoutSession],
    now              : Common.Timestamp,
  ) : Domain.SmartMenuResult {

    // Step 1-3: load state, compute time features, compute phase
    let muscles = getMusclesForWorkout(workoutType);

    // Step 4: apply fatigue decay
    let lastSessionAt : ?Common.Timestamp = if (recentSessions.size() > 0) {
      ?recentSessions[0].timestamp
    } else { null };
    let decayedFatigue = decayFatigue(trainingState.fatigueScore, lastSessionAt, now);
    let forceDeload = decayedFatigue > 20;
    let rawPhase = computePhase(trainingState.weekNumber);
    let phase = if (forceDeload) "deload" else rawPhase;

    // Step 5: score muscles
    let last3 = if (recentSessions.size() > 3) recentSessions.sliceToArray(0, 3) else recentSessions;
    let muscleScores : [(Text, Float)] = muscles.map<Text, (Text, Float)>(func(muscle) {
      let recovPct = getRecoveryPct(muscle, recoveryRecords, now);
      let hoursF   = hoursSinceLastTrained(muscle, recoveryRecords, now);
      let inRecent = muscleInRecentSessions(muscle, last3, 3);
      let score    = scoreMuscle(muscle, recovPct, hoursF, inRecent);
      (muscle, score)
    });

    // Step 6: select focus (top 2 by score)
    let sortedMuscles = muscleScores.sort(func(a : (Text, Float), b : (Text, Float)) : { #less; #equal; #greater } {
      if (a.1 > b.1) #less else if (a.1 < b.1) #greater else Text.compare(a.0, b.0)
    });

    let focus1 : Text = if (sortedMuscles.size() > 0) sortedMuscles[0].0 else muscles[0];
    var focus2 : Text = if (sortedMuscles.size() > 1) sortedMuscles[1].0 else focus1;
    let focus3 : ?Text = if (sortedMuscles.size() > 2) ?sortedMuscles[2].0 else null;

    // If same pair as last focus, replace 2nd with 3rd
    let prevPair : Bool = containsText(prevFocusMuscles, focus1) and containsText(prevFocusMuscles, focus2)
                         and prevFocusMuscles.size() == 2;
    if (prevPair) {
      switch (focus3) {
        case (?m) { focus2 := m };
        case null {};
      };
    };
    let focusMuscles : [Text] = [focus1, focus2];

    // Step 7: build base workout via 4-pass per muscle
    let selectedIds  : Map.Map<Text, Bool> = Map.empty();
    let patternCount : Map.Map<Text, Nat>  = Map.empty();
    var fatigueCount : Nat = 0;
    var rejectedAcc  : [(Text, Text)] = [];
    var selectionSteps : [Domain.SelectionStep] = [];
    var chosenExercises : [Domain.Exercise] = [];

    // Process focus muscles first, then non-focus
    let orderedMuscles = focusMuscles.concat(
      muscles.filter(func(m : Text) : Bool { not containsText(focusMuscles, m) })
    );

    // Determine if pulls are required (upper or fullBody)
    let needPulls = (workoutType == "upper" or workoutType == "fullBody");

    for (muscle in orderedMuscles.values()) {
      let isFocus    = containsText(focusMuscles, muscle);
      let recovPct   = getRecoveryPct(muscle, recoveryRecords, now);
      let target     = getTargetCount(isFocus, workoutType, profile.experienceLevel, recovPct);
      let pool       = exercises.filter(func(ex : Domain.Exercise) : Bool { ex.muscleGroup == muscle });

      // Check if we still need required pulls (for trace/selection purposes)
      let hasHPull = switch (patternCount.get("horizontal-pull")) { case null false; case (?c) c > 0 };
      let hasVPull = switch (patternCount.get("vertical-pull")) { case null false; case (?c) c > 0 };
      let needHPull = needPulls and not hasHPull;
      let needVPull = needPulls and not hasVPull;

      let beforeSize = chosenExercises.size();
      let (_, chosen, newFc, newRej) = selectForMuscle(
        pool, target, selectedIds, patternCount,
        fatigueCount, pbMap, needHPull, needVPull,
        rejectedAcc
      );
      fatigueCount := newFc;
      rejectedAcc  := newRej;
      chosenExercises := chosenExercises.concat(chosen);

      let afterSize = chosenExercises.size();
      selectionSteps := selectionSteps.concat([{
        step   = "select";
        input  = muscle # " (target=" # target.toText() # ", focus=" # (if isFocus "true" else "false") # ")";
        output = (afterSize - beforeSize).toText() # " exercises selected";
      }]);
    };

    // Step 8: apply modifiers (phase adjustments to SmartExercise happen in buildSmartExercise)
    // Step 9: anti-repetition — if exercise appeared in last 2 sessions, try to swap
    let last2 = if (recentSessions.size() > 2) recentSessions.sliceToArray(0, 2) else recentSessions;
    var finalExercises : [Domain.Exercise] = [];
    for (ex in chosenExercises.values()) {
      let appearedRecently = last2.find(func(sess : Domain.WorkoutSession) : Bool {
        sess.exercises.find(func(se : Domain.SmartExercise) : Bool { se.exerciseId == ex.id }) != null
      }) != null;
      if (appearedRecently) {
        // Try to find an alternative in same muscleGroup
        let pool = exercises.filter(func(e : Domain.Exercise) : Bool {
          e.muscleGroup == ex.muscleGroup
          and e.id != ex.id
          and (switch (selectedIds.get(e.id)) { case (?_) false; case null true })
        });
        if (pool.size() > 0) {
          // Pick first available alternative
          finalExercises := finalExercises.concat([pool[0]]);
          selectedIds.remove(ex.id);
          selectedIds.add(pool[0].id, true);
        } else {
          // no alternative — keep original
          finalExercises := finalExercises.concat([ex]);
        };
      } else {
        finalExercises := finalExercises.concat([ex]);
      };
    };

    // Step 10: enforce constraints — cap at 13, ensure ≥1 hPull and ≥1 vPull for upper/fullBody
    var workout13 : [Domain.Exercise] = if (finalExercises.size() > 13) {
      finalExercises.sliceToArray(0, 13)
    } else {
      finalExercises
    };

    if (needPulls) {
      let hasHPull = workout13.find(func(ex : Domain.Exercise) : Bool { ex.movement == "horizontal-pull" }) != null;
      let hasVPull = workout13.find(func(ex : Domain.Exercise) : Bool { ex.movement == "vertical-pull" }) != null;
      // If missing, inject from back exercises
      if (not hasHPull) {
        let candidate = exercises.find(func(ex : Domain.Exercise) : Bool {
          ex.movement == "horizontal-pull"
          and (switch (selectedIds.get(ex.id)) { case (?_) false; case null true })
        });
        switch (candidate) {
          case (?ex) {
            if (workout13.size() < 13) {
              workout13 := workout13.concat([ex]);
            } else {
              // Replace last exercise
              workout13 := workout13.sliceToArray(0, 12).concat([ex]);
            };
            selectedIds.add(ex.id, true);
          };
          case null {};
        };
      };
      if (not hasVPull) {
        let hasVPull2 = workout13.find(func(ex : Domain.Exercise) : Bool { ex.movement == "vertical-pull" }) != null;
        if (not hasVPull2) {
          let candidate = exercises.find(func(ex : Domain.Exercise) : Bool {
            ex.movement == "vertical-pull"
            and (switch (selectedIds.get(ex.id)) { case (?_) false; case null true })
          });
          switch (candidate) {
            case (?ex) {
              if (workout13.size() < 13) {
                workout13 := workout13.concat([ex]);
              } else {
                workout13 := workout13.sliceToArray(0, 12).concat([ex]);
              };
              selectedIds.add(ex.id, true);
            };
            case null {};
          };
        };
      };
    };

    // Deload: reduce total exercises, clamp [5,7]
    var workoutExercises : [Domain.Exercise] = if (phase == "deload") {
      let reduced = if (workout13.size() > 3) workout13.size() - 3 else workout13.size();
      let clamped = Nat.max(5, Nat.min(7, reduced));
      if (clamped < workout13.size()) workout13.sliceToArray(0, clamped) else workout13
    } else {
      workout13
    };

    // Step 11: validate — if fails, try fallback
    let smartWorkout : [Domain.SmartExercise] = workoutExercises.map<Domain.Exercise, Domain.SmartExercise>(func(ex) {
      let recovPct = getRecoveryPct(ex.muscleGroup, recoveryRecords, now);
      buildSmartExercise(ex, profile, phase, recovPct, pbMap, recentSessions)
    });

    let validErr = validateWorkout(smartWorkout, workoutType, focusMuscles);
    let finalWorkout : [Domain.SmartExercise] = switch (validErr) {
      case null { smartWorkout };
      case (?_) {
        // Regeneration attempt: reset and try a simpler selection
        // Fallback: 5-exercise deload-safe (alphabetical, no high-fatigue, workout-type muscles)
        let fallbackPool = exercises.filter(func(ex : Domain.Exercise) : Bool {
          containsText(muscles, ex.muscleGroup)
          and not containsText(highFatigueIds, ex.id)
        });
        let fallbackSorted = fallbackPool.sort(func(a : Domain.Exercise, b : Domain.Exercise) : { #less; #equal; #greater } {
          Text.compare(a.id, b.id)
        });
        let fallback5 = if (fallbackSorted.size() > 5) fallbackSorted.sliceToArray(0, 5) else fallbackSorted;
        fallback5.map<Domain.Exercise, Domain.SmartExercise>(func(ex) {
          let recovPct = getRecoveryPct(ex.muscleGroup, recoveryRecords, now);
          buildSmartExercise(ex, profile, "deload", recovPct, pbMap, recentSessions)
        })
      };
    };

    // Step 12: generate trace
    let rejectedItems : [Domain.RejectedExercise] = rejectedAcc.map<(Text, Text), Domain.RejectedExercise>(func((id, reason)) {
      { exerciseId = id; reason = reason }
    });

    let trace : Domain.EngineTrace = {
      phase               = phase;
      fatigueScore        = decayedFatigue;
      muscleScores        = muscleScores;
      selectedFocus       = focusMuscles;
      rejectedExercises   = rejectedItems;
      selectionSteps      = selectionSteps;
      finalOrderingReason = "Focus muscles first (" # focus1 # ", " # focus2 # "), then support muscles; compound before isolation within each muscle";
    };

    { workout = finalWorkout; trace = trace }
  };

  // Swap: best alternative for an exercise in the current workout
  public func swapExercise(
    currentExerciseId : Text,
    currentWorkout    : [Domain.SmartExercise],
    workoutType       : Text,
    profile           : Domain.UserProfile,
    recoveryRecords   : [Domain.MuscleRecovery],
    pbMap             : Map.Map<Text, Domain.PersonalBest>,
    now               : Common.Timestamp,
  ) : ?Domain.SmartExercise {
    // Find the muscleGroup of the current exercise
    let currentEx = exercises.find(func(ex : Domain.Exercise) : Bool { ex.id == currentExerciseId });
    let muscleGroup = switch (currentEx) {
      case null    { return null };
      case (?ex)   { ex.muscleGroup };
    };
    let currentMovement = switch (currentEx) {
      case null  { "" };
      case (?ex) { ex.movement };
    };

    // Build exclusion set: current + all in workout
    let excludeIds : [Text] = currentWorkout.map<Domain.SmartExercise, Text>(func(se) { se.exerciseId })
                                .concat([currentExerciseId]);

    // Candidate pool: same muscleGroup, not excluded
    let candidates = exercises.filter(func(ex : Domain.Exercise) : Bool {
      ex.muscleGroup == muscleGroup
      and ex.id != currentExerciseId
      and excludeIds.find(func(id : Text) : Bool { id == ex.id }) == null
    });

    // Rank: same movement first, then alphabetical
    let ranked = candidates.sort(func(a : Domain.Exercise, b : Domain.Exercise) : { #less; #equal; #greater } {
      let aMatch = a.movement == currentMovement;
      let bMatch = b.movement == currentMovement;
      if (aMatch and not bMatch)  { #less }
      else if (not aMatch and bMatch) { #greater }
      else Text.compare(a.id, b.id)
    });

    if (ranked.size() == 0) return null;
    let ex = ranked[0];
    let recovPct = getRecoveryPct(muscleGroup, recoveryRecords, now);
    let phase = computePhase(1); // neutral phase for swap
    ?buildSmartExercise(ex, profile, phase, recovPct, pbMap, [])
  };

  // Validate generated workout (returns error text or null)
  public func validateWorkout(
    workout      : [Domain.SmartExercise],
    workoutType  : Text,
    focusMuscles : [Text],
  ) : ?Text {
    // max 13 exercises
    if (workout.size() > 13) return ?("Too many exercises: " # workout.size().toText());

    // max 2 high-fatigue
    var hfCount : Nat = 0;
    for (ex in workout.values()) {
      if (containsText(highFatigueIds, ex.exerciseId)) { hfCount += 1 };
    };
    if (hfCount > 2) return ?("High-fatigue cap exceeded: " # hfCount.toText());

    // Upper & FullBody: ≥1 horizontal-pull and ≥1 vertical-pull
    if (workoutType == "upper" or workoutType == "fullBody") {
      let hasHPull = workout.find(func(ex : Domain.SmartExercise) : Bool { ex.movement == "horizontal-pull" }) != null;
      let hasVPull = workout.find(func(ex : Domain.SmartExercise) : Bool { ex.movement == "vertical-pull" }) != null;
      if (not hasHPull) return ?"Missing horizontal-pull";
      if (not hasVPull) return ?"Missing vertical-pull";
    };

    // Non-focus muscles must have exactly 1 exercise each
    let allWorkoutMuscles = getMusclesForWorkout(workoutType);
    for (muscle in allWorkoutMuscles.values()) {
      if (not containsText(focusMuscles, muscle)) {
        var cnt : Nat = 0;
        for (ex in workout.values()) {
          if (ex.muscleGroup == muscle) { cnt += 1 };
        };
        if (cnt > 1) return ?("Non-focus muscle " # muscle # " has more than 1 exercise");
      };
    };

    // Focus muscles must have strictly more total sets than any non-focus muscle
    // Build sets-per-muscle map
    let setsPerMuscle : Map.Map<Text, Nat> = Map.empty();
    for (ex in workout.values()) {
      let prev : Nat = switch (setsPerMuscle.get(ex.muscleGroup)) { case null 0; case (?n) n };
      setsPerMuscle.add(ex.muscleGroup, prev + ex.sets);
    };
    for (fm in focusMuscles.values()) {
      let focusSets : Nat = switch (setsPerMuscle.get(fm)) { case null 0; case (?n) n };
      for (muscle in allWorkoutMuscles.values()) {
        if (not containsText(focusMuscles, muscle)) {
          let nonFocusSets : Nat = switch (setsPerMuscle.get(muscle)) { case null 0; case (?n) n };
          if (nonFocusSets > 0 and focusSets <= nonFocusSets) {
            return ?("Focus muscle " # fm # " sets (" # focusSets.toText() # ") not strictly greater than non-focus " # muscle # " (" # nonFocusSets.toText() # ")")
          };
        };
      };
    };

    null
  };

};

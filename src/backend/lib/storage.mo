// lib/storage.mo — atomic state-update helpers (pure transforms, no actor state)
import Float "mo:core/Float";
import Map "mo:core/Map";
import Common "../types/common";
import Domain "../types/domain";

module {

  let EPS : Float = 0.01;

  // Update personal bests map after a logged session (atomic — no mid-loop writes)
  public func updatePersonalBests(
    pbMap      : Map.Map<Text, Domain.PersonalBest>,
    session    : Domain.WorkoutSession,
    now        : Common.Timestamp,
    calcEst1RM : (Float, Nat) -> Float,
  ) {
    for (ex in session.exercises.values()) {
      // Gather set logs for this exercise
      var peak1RM    : Float = 0.0;
      var peakWeight : Float = 0.0;
      var peakReps   : Nat   = 0;

      for ((exId, logs) in session.setLogs.values()) {
        if (exId == ex.exerciseId) {
          for (setLog in logs.values()) {
            let cur = calcEst1RM(setLog.weightUsed, setLog.repsCompleted);
            if (cur > peak1RM) {
              peak1RM    := cur;
              peakWeight := setLog.weightUsed;
              peakReps   := setLog.repsCompleted;
            };
          };
        };
      };

      if (peak1RM > 0.0) {
        let shouldUpdate = switch (pbMap.get(ex.exerciseId)) {
          case null  { true };
          case (?pb) { peak1RM > pb.est1RM + EPS };
        };
        if (shouldUpdate) {
          pbMap.add(ex.exerciseId, {
            exerciseId = ex.exerciseId;
            weight     = peakWeight;
            reps       = peakReps;
            est1RM     = peak1RM;
            achievedAt = now;
          });
        };
      };
    };
  };

  // Update recovery timestamps for trained muscle groups
  public func updateRecovery(
    recoveryRecords  : [Domain.MuscleRecovery],
    session          : Domain.WorkoutSession,
    exercises        : [Domain.Exercise],
    now              : Common.Timestamp,
    allMuscles       : [Text],
    getBaselineHours : (Text) -> Nat,
  ) : [Domain.MuscleRecovery] {
    // Collect trained muscles from session (resolve from library, never trust caller)
    let trainedMuscles : [Text] = session.exercises.filter(func(se : Domain.SmartExercise) : Bool {
      exercises.find(func(ex : Domain.Exercise) : Bool { ex.id == se.exerciseId }) != null
    }).map<Domain.SmartExercise, Text>(func(se) {
      switch (exercises.find(func(ex : Domain.Exercise) : Bool { ex.id == se.exerciseId })) {
        case (?ex) { ex.muscleGroup };
        case null  { se.muscleGroup }; // fallback (should never happen)
      }
    });

    // Build updated records — one per known muscle group
    allMuscles.map<Text, Domain.MuscleRecovery>(func(muscle) {
      let wasTrained = trainedMuscles.find(func(m : Text) : Bool { m == muscle }) != null;
      if (wasTrained) {
        { muscleGroup = muscle; lastTrainedAt = now }
      } else {
        // Preserve existing record or leave at default
        switch (recoveryRecords.find(func(r : Domain.MuscleRecovery) : Bool { r.muscleGroup == muscle })) {
          case (?r) { r };
          case null { { muscleGroup = muscle; lastTrainedAt = 0 } };
        }
      }
    })
  };

  // Prepend new session and cap history at 100 entries
  public func prependSession(
    history : [Domain.WorkoutSession],
    session : Domain.WorkoutSession,
  ) : [Domain.WorkoutSession] {
    let combined = [session].concat(history);
    if (combined.size() > 100) combined.sliceToArray(0, 100) else combined
  };

  // Accumulate fatigue and advance weekNumber after a logged session
  public func advanceTrainingState(
    state         : Domain.TrainingState,
    fatigueDelta  : Nat,
    now           : Common.Timestamp,
    lastSessionAt : ?Common.Timestamp,
  ) : Domain.TrainingState {
    let newFatigue = state.fatigueScore + fatigueDelta;
    let newWeek    = if (state.weekNumber >= 4) 1 else state.weekNumber + 1;
    { weekNumber = newWeek; fatigueScore = newFatigue }
  };

  // Compute total volume for a session
  public func computeTotalVolume(session : Domain.WorkoutSession) : Float {
    var total : Float = 0.0;
    for ((_, logs) in session.setLogs.values()) {
      for (setLog in logs.values()) {
        total += setLog.weightUsed * setLog.repsCompleted.toFloat();
      };
    };
    total
  };

  // Delete PBs whose exerciseId is not in the provided library (upgrade clean-slate)
  public func pruneLegacyPBs(
    pbMap    : Map.Map<Text, Domain.PersonalBest>,
    validIds : [Text],
  ) {
    let keysToRemove : [Text] = pbMap.keys()
      .filter(func(k : Text) : Bool {
        validIds.find(func(id : Text) : Bool { id == k }) == null
      })
      .toArray();
    for (k in keysToRemove.values()) {
      pbMap.remove(k);
    };
  };

};

// main.mo — composition root for CaffeineCoach v2.4
// All stable state lives here. No business logic. Delegates 100% to mixins.
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Domain "types/domain";
import CoachApi "mixins/coach-api";
import Migration "migration";

(with migration = Migration.run)
persistent actor CaffeineCoach {

  // ── Stable State (clean slate on upgrade — all Map.empty()) ───────────────
  // Wipes all user data on upgrade per v2.4 spec.
  let users            : Map.Map<Principal, Domain.UserProfile>                       = Map.empty();
  let sessions         : Map.Map<Principal, [Domain.WorkoutSession]>                  = Map.empty();
  let bests            : Map.Map<Principal, Map.Map<Text, Domain.PersonalBest>>       = Map.empty();
  let recovery         : Map.Map<Principal, [Domain.MuscleRecovery]>                  = Map.empty();
  let trainingState    : Map.Map<Principal, Domain.TrainingState>                     = Map.empty();
  let lastFocusMuscles : Map.Map<Principal, [Text]>                                   = Map.empty();

  // ── API Surface ────────────────────────────────────────────────────────────
  include CoachApi(users, sessions, bests, recovery, trainingState, lastFocusMuscles);

};

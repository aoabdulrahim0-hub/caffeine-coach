import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CoachRecommendation,
  Exercise,
  PersonalBest,
  ReadinessItem,
  SmartMenuResult,
  TrainingState,
  UserProfile,
  WorkoutSession,
} from "../types";
import { useActor } from "./useActor";

// ─── Profile ────────────────────────────────────────────────────────────────

export function useUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getUserProfile() as Promise<UserProfile | null>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.setUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["coachRecommendation"] });
    },
  });
}

// ─── Readiness ───────────────────────────────────────────────────────────────

export function useReadiness() {
  const { actor, isFetching } = useActor();
  return useQuery<ReadinessItem[]>({
    queryKey: ["readiness"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getReadiness() as Promise<ReadinessItem[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Coach Recommendation ───────────────────────────────────────────────────

export function useCoachRecommendation() {
  const { actor, isFetching } = useActor();
  return useQuery<CoachRecommendation | null>({
    queryKey: ["coachRecommendation"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCoachRecommendation() as Promise<CoachRecommendation | null>;
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Smart Menu ──────────────────────────────────────────────────────────────

/**
 * Returns { workout: SmartExercise[]; trace: EngineTrace } from the backend.
 * workoutType is a plain string: "upper" | "lower" | "fullBody"
 */
export function useSmartMenu(workoutType: string | null) {
  const { actor, isFetching } = useActor();
  const key = workoutType ?? "none";
  return useQuery<SmartMenuResult>({
    queryKey: ["smartMenu", key],
    queryFn: async () => {
      if (!actor || !workoutType) {
        return {
          workout: [],
          trace: {
            phase: "",
            fatigueScore: BigInt(0),
            muscleScores: [],
            selectedFocus: [],
            rejectedExercises: [],
            selectionSteps: [],
            finalOrderingReason: "",
          },
        };
      }
      const result = await actor.getSmartMenu(workoutType);
      return result as SmartMenuResult;
    },
    enabled: !!actor && !isFetching && !!workoutType,
    // Don't refetch on window focus — workout stays stable during review
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

// ─── Training State ──────────────────────────────────────────────────────────

export function useTrainingState() {
  const { actor, isFetching } = useActor();
  return useQuery<TrainingState | null>({
    queryKey: ["trainingState"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getTrainingState() as Promise<TrainingState | null>;
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Exercises ───────────────────────────────────────────────────────────────

export function useExercises() {
  const { actor, isFetching } = useActor();
  return useQuery<Exercise[]>({
    queryKey: ["exercises"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getExercises() as Promise<Exercise[]>;
    },
    enabled: !!actor && !isFetching,
    // Exercise library is static — never stale
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}

// ─── Personal Bests ──────────────────────────────────────────────────────────

/**
 * Backend returns Array<[string, PersonalBest]> — a map as entries.
 * We normalize to a flat Record<string, PersonalBest> for easy lookup.
 */
export function usePersonalBests() {
  const { actor, isFetching } = useActor();
  return useQuery<Record<string, PersonalBest>>({
    queryKey: ["personalBests"],
    queryFn: async () => {
      if (!actor) return {};
      const entries = (await actor.getPersonalBests()) as Array<
        [string, PersonalBest]
      >;
      return Object.fromEntries(entries);
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Workout History ─────────────────────────────────────────────────────────

export function useWorkoutHistory(offset: number, limit: number) {
  const { actor, isFetching } = useActor();
  return useQuery<WorkoutSession[]>({
    queryKey: ["workoutHistory", offset, limit],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getWorkoutHistory(BigInt(offset), BigInt(limit)) as Promise<
        WorkoutSession[]
      >;
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Log Workout ─────────────────────────────────────────────────────────────

/**
 * logWorkout returns Result<(), Text> from the backend.
 * We handle __kind__ "ok" | "err" and throw on error so React Query
 * marks the mutation as failed.
 */
export function useLogWorkout() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (session: WorkoutSession) => {
      if (!actor) throw new Error("Actor not ready");
      const result = (await actor.logWorkout(session)) as
        | { __kind__: "ok"; ok: null }
        | { __kind__: "err"; err: string };
      if (result.__kind__ === "err") {
        throw new Error(result.err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutHistory"] });
      queryClient.invalidateQueries({ queryKey: ["personalBests"] });
      queryClient.invalidateQueries({ queryKey: ["readiness"] });
      queryClient.invalidateQueries({ queryKey: ["coachRecommendation"] });
      queryClient.invalidateQueries({ queryKey: ["trainingState"] });
      queryClient.invalidateQueries({ queryKey: ["smartMenu"] });
    },
  });
}

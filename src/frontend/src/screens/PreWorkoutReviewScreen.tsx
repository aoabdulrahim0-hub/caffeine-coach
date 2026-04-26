import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Brain,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Dumbbell,
  Play,
  RotateCcw,
  Target,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useExercises, useSmartMenu } from "../hooks/useQueries";
import { useUnits } from "../hooks/useUnits";
import type {
  EngineTrace,
  Exercise,
  SmartExercise,
  SmartMenuResult,
  WorkoutType,
} from "../types";
import { workoutTypeLabel } from "../utils/workoutTypes";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  workoutType: WorkoutType;
  onBack: () => void;
  onBeginWorkout: (exercises: SmartExercise[], result: SmartMenuResult) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MUSCLE_COLORS: Record<string, string> = {
  chest: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  back: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  shoulders: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  arms: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  core: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  quads: "bg-green-500/15 text-green-400 border-green-500/30",
  hamstrings: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  glutes: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  calves: "bg-red-500/15 text-red-400 border-red-500/30",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function progressionClass(flag: string): string {
  if (flag === "Increase weight") return "progression-increase";
  if (flag === "Deload") return "progression-deload";
  return "progression-maintain";
}

function progressionIcon(flag: string): React.ReactNode {
  if (flag === "Increase weight")
    return <TrendingUp className="w-3 h-3 flex-shrink-0" />;
  if (flag === "Deload")
    return <ChevronDown className="w-3 h-3 flex-shrink-0" />;
  return <Zap className="w-3 h-3 flex-shrink-0" />;
}

function fatigueLabel(score: number): { label: string; cls: string } {
  if (score <= 5) return { label: "Fresh", cls: "text-success" };
  if (score <= 10) return { label: "Normal", cls: "text-accent" };
  if (score <= 15) return { label: "Tired", cls: "text-warning" };
  if (score <= 20) return { label: "High", cls: "text-warning" };
  return { label: "Deload Zone", cls: "text-destructive" };
}

function phaseBadgeClass(phase: string): string {
  if (phase === "intensification") return "phase-intensification";
  if (phase === "deload") return "phase-deload";
  return "phase-accumulation";
}

// Sort swap candidates: same movement first, then alphabetical
function sortSwapCandidates(
  candidates: Exercise[],
  targetMovement: string,
): Exercise[] {
  return [...candidates].sort((a, b) => {
    const aMatch = a.movement === targetMovement ? 0 : 1;
    const bMatch = b.movement === targetMovement ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.name.localeCompare(b.name);
  });
}

// ─── Muscle Score Bar ────────────────────────────────────────────────────────

function MuscleScoreRow({
  muscle,
  score,
  isFocus,
  maxScore,
}: {
  muscle: string;
  score: number;
  isFocus: boolean;
  maxScore: number;
}) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`w-24 flex-shrink-0 capitalize ${isFocus ? "text-accent font-semibold" : "text-muted-foreground"}`}
      >
        {muscle}
        {isFocus && (
          <span className="ml-1 text-accent text-[10px] font-bold">★</span>
        )}
      </span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isFocus ? "bg-accent" : "bg-muted-foreground/40"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right font-mono text-muted-foreground">
        {score.toFixed(1)}
      </span>
    </div>
  );
}

// ─── Coach Reasoning Panel ────────────────────────────────────────────────────

function CoachReasoningPanel({ trace }: { trace: EngineTrace }) {
  const [open, setOpen] = useState(false);
  const [stepsExpanded, setStepsExpanded] = useState(false);

  const fatigueNum = Number(trace.fatigueScore);
  const { label: fatigueLbl, cls: fatigueCls } = fatigueLabel(fatigueNum);

  // Top 5 muscle scores sorted descending
  const sortedScores = useMemo(
    () => [...trace.muscleScores].sort((a, b) => b[1] - a[1]).slice(0, 5),
    [trace.muscleScores],
  );
  const maxScore = sortedScores.length > 0 ? sortedScores[0][1] : 1;
  const focusSet = new Set(trace.selectedFocus);

  // Top 5 rejected exercises
  const topRejected = trace.rejectedExercises.slice(0, 5);

  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden"
      data-ocid="pre_workout.trace_panel"
    >
      {/* Toggle header */}
      <button
        type="button"
        data-ocid="pre_workout.trace_toggle"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/40 transition-colors"
        aria-expanded={open}
        aria-controls="trace-content"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent flex-shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Coach Reasoning
          </span>
          {trace.phase && (
            <span className={`phase-badge ${phaseBadgeClass(trace.phase)}`}>
              {trace.phase}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold font-mono ${fatigueCls}`}>
            Fatigue: {fatigueNum}
          </span>
          {open ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Collapsible content */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="trace-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border divide-y divide-border/60">
              {/* Fatigue status */}
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                  CNS Fatigue
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((fatigueNum / 25) * 100, 100)}%`,
                        backgroundColor:
                          fatigueNum > 20
                            ? "oklch(var(--destructive))"
                            : fatigueNum > 15
                              ? "oklch(var(--warning))"
                              : fatigueNum > 10
                                ? "oklch(var(--accent))"
                                : "oklch(var(--success))",
                      }}
                    />
                  </div>
                  <span className={`text-xs font-bold font-mono ${fatigueCls}`}>
                    {fatigueNum} — {fatigueLbl}
                  </span>
                </div>
              </div>

              {/* Focus muscles */}
              {trace.selectedFocus.length > 0 && (
                <div className="px-4 py-3 space-y-2">
                  <p className="trace-label flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    Selected Focus
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {trace.selectedFocus.map((m) => (
                      <span key={m} className="muscle-badge muscle-focus">
                        ★ {m}
                      </span>
                    ))}
                  </div>
                  {sortedScores.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Focus selected by highest priority score (recovery ×
                      recency × freshness)
                    </p>
                  )}
                </div>
              )}

              {/* Muscle scores */}
              {sortedScores.length > 0 && (
                <div className="px-4 py-3 space-y-2.5">
                  <p className="trace-label">Muscle Priority Scores</p>
                  <div className="space-y-2">
                    {sortedScores.map(([muscle, score]) => (
                      <MuscleScoreRow
                        key={muscle}
                        muscle={muscle}
                        score={score}
                        isFocus={focusSet.has(muscle)}
                        maxScore={maxScore}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Rejected exercises */}
              {topRejected.length > 0 && (
                <div className="px-4 py-3 space-y-2">
                  <p className="trace-label">Top Rejected Exercises</p>
                  <div className="space-y-1.5">
                    {topRejected.map((r) => (
                      <div
                        key={r.exerciseId}
                        className="flex items-start gap-2 text-xs"
                      >
                        <span className="font-mono text-muted-foreground/80 flex-shrink-0 w-36 truncate">
                          {r.exerciseId}
                        </span>
                        <span className="text-destructive/80">{r.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selection steps (nested collapsible) */}
              {trace.selectionSteps.length > 0 && (
                <div className="px-4 py-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => setStepsExpanded((s) => !s)}
                    className="trace-label flex items-center gap-1.5 hover:text-foreground transition-colors w-full text-left"
                    data-ocid="pre_workout.trace_steps_toggle"
                  >
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${stepsExpanded ? "rotate-90" : ""}`}
                    />
                    Selection Steps ({trace.selectionSteps.length})
                  </button>
                  <AnimatePresence>
                    {stepsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 pt-1">
                          {trace.selectionSteps.map((s) => (
                            <div
                              key={`${s.step}::${s.input}`}
                              className="text-xs space-y-0.5 pl-3 border-l-2 border-border"
                            >
                              <p className="text-foreground font-medium">
                                {s.step}
                              </p>
                              <p className="text-muted-foreground">
                                {s.input}
                                {s.output ? ` → ${s.output}` : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Final ordering reason */}
              {trace.finalOrderingReason && (
                <div className="px-4 py-3 space-y-1.5">
                  <p className="trace-label">Final Ordering</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {trace.finalOrderingReason}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────

function ExerciseCard({
  se,
  idx,
  isFocus,
  formatWeight,
  onSwap,
  onRemove,
}: {
  se: SmartExercise;
  idx: number;
  isFocus: boolean;
  formatWeight: (kg: number) => string;
  onSwap: () => void;
  onRemove: () => void;
}) {
  const muscleBadgeClass =
    MUSCLE_COLORS[se.muscleGroup] ??
    "bg-secondary text-muted-foreground border-border";

  return (
    <motion.div
      data-ocid={`pre_workout.exercise.item.${idx + 1}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 16, scale: 0.97 }}
      transition={{ duration: 0.22, delay: idx * 0.035 }}
      className={`exercise-card ${isFocus ? "border-accent/40 bg-accent/5" : ""}`}
    >
      {/* Focus indicator strip */}
      {isFocus && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent rounded-l-xl" />
      )}

      <div className="exercise-header">
        {/* Left: name + meta */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="exercise-title text-sm leading-tight">
              {se.name}
            </span>
            {isFocus && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-accent border border-accent/30 uppercase tracking-wider">
                Focus
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`muscle-badge ${muscleBadgeClass}`}>
              {se.muscleGroup}
            </span>
            <span className="movement-pill">{se.movement}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground text-sm">
                {Number(se.sets)}
              </span>{" "}
              sets
            </span>
            <span className="text-muted-foreground text-xs">×</span>
            <span className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground text-sm">
                {se.repRange}
              </span>{" "}
              reps
            </span>
          </div>
          {se.coachTip && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {se.coachTip}
            </p>
          )}
        </div>

        {/* Right: weight + flag */}
        <div className="flex-shrink-0 text-right space-y-2 pl-3">
          <div>
            <span className="text-xl font-bold font-display text-foreground leading-none">
              {formatWeight(se.targetWeight)}
            </span>
          </div>
          <span
            className={`progression-flag ${progressionClass(se.progressionFlag)}`}
          >
            {progressionIcon(se.progressionFlag)}
            {se.progressionFlag}
          </span>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/60">
        <button
          type="button"
          data-ocid={`pre_workout.swap.${idx + 1}_button`}
          onClick={onSwap}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors px-2.5 py-1.5 rounded-md hover:bg-accent/10"
        >
          <RotateCcw className="w-3 h-3" />
          Swap
        </button>
        <div className="w-px h-4 bg-border" />
        <button
          type="button"
          data-ocid={`pre_workout.remove.${idx + 1}_delete_button`}
          onClick={onRemove}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-2.5 py-1.5 rounded-md hover:bg-destructive/10"
        >
          <Trash2 className="w-3 h-3" />
          Remove
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PreWorkoutReviewScreen({
  workoutType,
  onBack,
  onBeginWorkout,
}: Props) {
  const { data: smartMenuResult, isLoading } = useSmartMenu(workoutType);
  const { data: allExercises, isLoading: isLoadingExercises } = useExercises();
  const { formatWeight } = useUnits();

  const [exercises, setExercises] = useState<SmartExercise[] | null>(null);
  const activeExercises = exercises ?? smartMenuResult?.workout ?? [];

  const [swapTarget, setSwapTarget] = useState<SmartExercise | null>(null);

  // Sync once when smart menu loads
  useEffect(() => {
    if (smartMenuResult && smartMenuResult.workout.length > 0) {
      setExercises((prev) => (prev === null ? smartMenuResult.workout : prev));
    }
  }, [smartMenuResult]);

  function handleRemove(exerciseId: string) {
    setExercises((prev) =>
      (prev ?? []).filter((e) => e.exerciseId !== exerciseId),
    );
  }

  function handleSwap(incoming: Exercise) {
    if (!swapTarget) return;
    const newEx: SmartExercise = {
      ...swapTarget,
      exerciseId: incoming.id,
      name: incoming.name,
      muscleGroup: incoming.muscleGroup,
      movement: incoming.movement,
    };
    setExercises((prev) =>
      (prev ?? []).map((e) =>
        e.exerciseId === swapTarget.exerciseId ? newEx : e,
      ),
    );
    setSwapTarget(null);
  }

  // Build active IDs set excluding the swap target to allow it to appear in swap list
  const activeExerciseIds = useMemo(
    () =>
      new Set(
        activeExercises
          .filter((ae) => ae.exerciseId !== swapTarget?.exerciseId)
          .map((ae) => ae.exerciseId),
      ),
    [activeExercises, swapTarget],
  );

  // Swap candidates: same muscle, excluding current + in-workout, sorted same-movement first
  const swapCandidates = useMemo<Exercise[]>(() => {
    if (!swapTarget) return [];
    const raw = (allExercises ?? []).filter(
      (ex) =>
        ex.muscleGroup === swapTarget.muscleGroup &&
        ex.id !== swapTarget.exerciseId &&
        !activeExerciseIds.has(ex.id),
    );
    return sortSwapCandidates(raw, swapTarget.movement);
  }, [swapTarget, allExercises, activeExerciseIds]);

  const trace = smartMenuResult?.trace;
  const focusSet = useMemo(() => new Set(trace?.selectedFocus ?? []), [trace]);

  // Focus muscle summary for header
  const focusMuscles = trace?.selectedFocus ?? [];

  const emptyFallbackResult: SmartMenuResult = {
    workout: activeExercises,
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

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-3 pb-3 shadow-subtle">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-ocid="pre_workout.back_button"
            onClick={onBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-display font-bold text-foreground leading-tight">
                Pre-Workout Review
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-md bg-accent/15 border border-accent/30 text-accent font-semibold uppercase tracking-wide flex-shrink-0">
                {workoutTypeLabel(workoutType)}
              </span>
            </div>
            {!isLoading && activeExercises.length > 0 && (
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  <span className="text-foreground font-semibold">
                    {activeExercises.length}
                  </span>{" "}
                  exercises
                </span>
                {focusMuscles.length > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3 h-3 text-accent flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        Focus:
                      </span>
                      <div className="flex gap-1">
                        {focusMuscles.map((m) => (
                          <span
                            key={m}
                            className="muscle-badge muscle-focus text-[10px] px-1.5 py-0.5"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-28">
        {isLoading ? (
          <div className="space-y-3" data-ocid="pre_workout.loading_state">
            {/* Skeleton trace panel */}
            <Skeleton className="h-12 w-full rounded-xl" />
            {["s1", "s2", "s3", "s4", "s5", "s6"].map((k) => (
              <Skeleton key={k} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : activeExercises.length === 0 ? (
          <div
            data-ocid="pre_workout.empty_state"
            className="flex flex-col items-center justify-center py-16 gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-display font-semibold text-foreground">
                No exercises available
              </p>
              <p className="text-sm text-muted-foreground">
                Try a different workout type or check your profile settings.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              data-ocid="pre_workout.empty_back_button"
            >
              Go back
            </Button>
          </div>
        ) : (
          <>
            {/* Coach Reasoning Panel */}
            {trace && <CoachReasoningPanel trace={trace} />}

            {/* Exercise list */}
            <AnimatePresence mode="popLayout">
              {activeExercises.map((se, idx) => (
                <ExerciseCard
                  key={se.exerciseId}
                  se={se}
                  idx={idx}
                  isFocus={focusSet.has(se.muscleGroup)}
                  formatWeight={formatWeight}
                  onSwap={() => setSwapTarget(se)}
                  onRemove={() => handleRemove(se.exerciseId)}
                />
              ))}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Begin Workout CTA */}
      {activeExercises.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-4 py-4 bg-background/95 backdrop-blur border-t border-border">
          <Button
            data-ocid="pre_workout.begin_workout_button"
            className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base shadow-lg"
            onClick={() =>
              onBeginWorkout(
                activeExercises,
                smartMenuResult ?? emptyFallbackResult,
              )
            }
          >
            <Play className="mr-2 h-4 w-4" />
            Begin Workout
            <span className="ml-2 opacity-70 text-sm font-normal">
              ({activeExercises.length})
            </span>
          </Button>
        </div>
      )}

      {/* Swap Dialog */}
      <Dialog
        open={!!swapTarget}
        onOpenChange={(o) => !o && setSwapTarget(null)}
      >
        <DialogContent
          className="bg-card border-border max-w-sm mx-auto"
          data-ocid="pre_workout.swap.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Swap Exercise</DialogTitle>
          </DialogHeader>

          <div className="space-y-1 mb-3">
            <p className="text-sm text-muted-foreground">
              Replacing:{" "}
              <span className="text-foreground font-semibold">
                {swapTarget?.name}
              </span>
            </p>
            {swapTarget && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`muscle-badge text-xs ${MUSCLE_COLORS[swapTarget.muscleGroup] ?? "bg-secondary text-muted-foreground border-border"}`}
                >
                  {swapTarget.muscleGroup}
                </span>
                <span className="movement-pill text-xs">
                  {swapTarget.movement}
                </span>
              </div>
            )}
          </div>

          {isLoadingExercises ? (
            <div className="space-y-2">
              {[1, 2, 3].map((k) => (
                <Skeleton key={k} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : swapCandidates.length === 0 ? (
            <div
              className="text-center py-6 space-y-2"
              data-ocid="pre_workout.swap.empty_state"
            >
              <p className="text-sm text-muted-foreground">
                No alternatives available for this muscle group.
              </p>
              <p className="text-xs text-muted-foreground/60">
                All exercises in this group are already in your workout.
              </p>
            </div>
          ) : (
            <div
              className="space-y-1.5 max-h-72 overflow-y-auto"
              data-ocid="pre_workout.swap.list"
            >
              {swapCandidates.map((ex, i) => {
                const sameMovement = ex.movement === swapTarget?.movement;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    data-ocid={`pre_workout.swap_option.item.${i + 1}`}
                    onClick={() => handleSwap(ex)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/40 hover:bg-secondary border border-border hover:border-accent/40 transition-colors text-left group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                          {ex.name}
                        </span>
                        {sameMovement && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 border-accent/40 text-accent"
                          >
                            Same pattern
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ex.movement}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

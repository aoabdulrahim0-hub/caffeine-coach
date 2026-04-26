import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  SkipForward,
  Timer,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLogWorkout, useUserProfile } from "../hooks/useQueries";
import { useUnits } from "../hooks/useUnits";
import type { SmartExercise, WorkoutType } from "../types";

// ─── Types ─────────────────────────────────────────────────────────────────

interface LoggedSet {
  weight: number;
  reps: number;
  rpe: number | null;
}

interface Props {
  exercises: SmartExercise[];
  workoutType: WorkoutType;
  onFinish: () => void;
  onCancel: () => void;
}

// ─── Rest Timer ─────────────────────────────────────────────────────────────

function RestTimer({
  seconds,
  total,
  onSkip,
  onAdjust,
}: {
  seconds: number;
  total: number;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
}) {
  const pct = Math.max(0, (seconds / Math.max(1, total)) * 100);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isUrgent = seconds <= 10 && seconds > 0;
  const circumference = 2 * Math.PI * 45; // r=45 → ~283

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-5 py-6"
      data-ocid="workout.rest_timer"
    >
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
        <Timer className="w-3.5 h-3.5" /> Resting
      </p>

      {/* SVG ring timer */}
      <div className={`relative w-32 h-32 ${isUrgent ? "pulse-ring" : ""}`}>
        <svg
          className="w-full h-full -rotate-90"
          viewBox="0 0 100 100"
          role="img"
          aria-label={`Rest: ${mins > 0 ? `${mins}m ` : ""}${secs}s remaining`}
        >
          <title>Rest timer</title>
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="oklch(0.20 0.022 245)"
            strokeWidth="6"
          />
          {/* Progress */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={isUrgent ? "oklch(0.60 0.22 25)" : "oklch(0.72 0.15 210)"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * pct) / 100}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-2xl font-display font-bold transition-colors ${
              isUrgent ? "text-destructive" : "text-foreground"
            }`}
          >
            {mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}s`}
          </span>
        </div>
      </div>

      {/* Adjust + Skip */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-ocid="workout.rest_minus_button"
          onClick={() => onAdjust(-30)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 hover:bg-secondary transition-colors"
        >
          <Minus className="w-3 h-3" /> 30s
        </button>
        <button
          type="button"
          data-ocid="workout.rest_skip_button"
          onClick={onSkip}
          className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 border border-accent/40 rounded-md px-3 py-1.5 hover:bg-accent/10 transition-colors"
        >
          <SkipForward className="w-3 h-3" /> Skip
        </button>
        <button
          type="button"
          data-ocid="workout.rest_plus_button"
          onClick={() => onAdjust(30)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 hover:bg-secondary transition-colors"
        >
          <Plus className="w-3 h-3" /> 30s
        </button>
      </div>
    </motion.div>
  );
}

// ─── Completion Screen ──────────────────────────────────────────────────────

function CompletionScreen({
  exercises,
  allSets,
  elapsedSeconds,
  onFinish,
  formatWeight,
}: {
  exercises: SmartExercise[];
  allSets: LoggedSet[][];
  elapsedSeconds: number;
  onFinish: () => void;
  formatWeight: (kg: number) => string;
}) {
  const totalVolume = allSets.reduce(
    (acc, sets) => acc + sets.reduce((a, s) => a + s.weight * s.reps, 0),
    0,
  );
  const totalSets = allSets.reduce((acc, sets) => acc + sets.length, 0);
  const exercisesLogged = allSets.filter((s) => s.length > 0).length;
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;

  const stats = [
    {
      label: "Total Volume",
      value: formatWeight(totalVolume),
      icon: Zap,
      color: "text-accent",
    },
    {
      label: "Sets Logged",
      value: String(totalSets),
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      label: "Exercises",
      value: `${exercisesLogged} / ${exercises.length}`,
      icon: Trophy,
      color: "text-warning",
    },
    {
      label: "Duration",
      value: mins > 0 ? `${mins}m ${secs}s` : `${secs}s`,
      icon: Timer,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm space-y-8"
        data-ocid="workout.completion_section"
      >
        {/* Trophy badge */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-success/20 border-2 border-success/40 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-10 h-10 text-success" />
          </motion.div>
          <h2 className="text-3xl font-display font-bold text-foreground">
            Workout Done!
          </h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Great session. Recovery clock starts now.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ label, value, icon: Icon, color }, idx) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx + 0.3 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <Icon className={`w-4 h-4 mb-2 ${color}`} />
              <p className="text-xl font-display font-bold text-foreground">
                {value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Per-exercise summary */}
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          {exercises.map((ex, i) => {
            const sets = allSets[i] ?? [];
            const vol = sets.reduce((a, s) => a + s.weight * s.reps, 0);
            return (
              <div
                key={ex.exerciseId}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {ex.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sets.length} sets
                  </p>
                </div>
                {sets.length > 0 ? (
                  <span className="text-xs text-accent font-semibold shrink-0 ml-2">
                    {formatWeight(vol)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    Skipped
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <Button
          data-ocid="workout.finish_button"
          className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base"
          onClick={onFinish}
        >
          Back to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}

// ─── Main Logger ────────────────────────────────────────────────────────────

export default function ActiveWorkoutLogger({
  exercises,
  workoutType,
  onFinish,
  onCancel,
}: Props) {
  const { data: profile } = useUserProfile();
  const { formatWeight, toDisplay, toKg, unit } = useUnits();
  const { mutateAsync: logWorkout, isPending: isLogging } = useLogWorkout();

  // ── State ──────────────────────────────────────────────────────────────────
  const [currentIdx, setCurrentIdx] = useState(0);
  const [allSets, setAllSets] = useState<LoggedSet[][]>(() =>
    exercises.map(() => []),
  );

  // Input state (always in display units for user, stored as kg internally)
  const [inputWeight, setInputWeight] = useState("");
  const [inputReps, setInputReps] = useState("");
  const [inputRpe, setInputRpe] = useState<number | null>(null);

  const [isResting, setIsResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(90);
  const [restTotal, setRestTotal] = useState(90);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isComplete, setIsComplete] = useState(false);

  // Elapsed time
  const startTimeRef = useRef<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentExercise = exercises[currentIdx];
  const currentSets = allSets[currentIdx] ?? [];
  const targetSets = Number(currentExercise.sets);
  const setsRemaining = Math.max(0, targetSets - currentSets.length);

  // ── Seed inputs when exercise changes ─────────────────────────────────────
  useEffect(() => {
    const prevSets = allSets[currentIdx];
    const lastSet = prevSets?.[prevSets.length - 1];
    const exTargetWeight = exercises[currentIdx]?.targetWeight ?? 20;
    const exRepRange = exercises[currentIdx]?.repRange ?? "8-12";
    const parts = exRepRange.split("-");
    const midReps =
      parts.length === 2
        ? Math.round((Number(parts[0]) + Number(parts[1])) / 2)
        : Number(parts[0]) || 8;
    if (lastSet) {
      setInputWeight(toDisplay(lastSet.weight).toFixed(1));
      setInputReps(String(lastSet.reps));
    } else {
      setInputWeight(toDisplay(exTargetWeight).toFixed(1));
      setInputReps(String(midReps));
    }
    setInputRpe(null);
  }, [currentIdx, allSets, exercises, toDisplay]);

  // ── Elapsed timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Rest timer ─────────────────────────────────────────────────────────────
  const defaultRestSeconds = profile ? Number(profile.restTimerSeconds) : 90;

  const startRestTimer = useCallback((seconds: number) => {
    if (restRef.current) clearInterval(restRef.current);
    setRestTotal(seconds);
    setRestSeconds(seconds);
    setIsResting(true);
  }, []);

  const stopRestTimer = useCallback(() => {
    if (restRef.current) clearInterval(restRef.current);
    setIsResting(false);
  }, []);

  useEffect(() => {
    if (!isResting) return;
    restRef.current = setInterval(() => {
      setRestSeconds((s) => {
        if (s <= 1) {
          clearInterval(restRef.current!);
          setIsResting(false);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (restRef.current) clearInterval(restRef.current);
    };
  }, [isResting]);

  function handleAdjustRest(delta: number) {
    setRestSeconds((s) => Math.max(5, Math.min(600, s + delta)));
    setRestTotal((t) => Math.max(5, Math.min(600, t + delta)));
  }

  // ── Log Set ────────────────────────────────────────────────────────────────
  function handleLogSet() {
    const wDisplay = Number.parseFloat(inputWeight);
    const r = Number.parseInt(inputReps, 10);
    if (Number.isNaN(wDisplay) || wDisplay <= 0) {
      toast.error("Enter a valid weight.");
      return;
    }
    if (Number.isNaN(r) || r <= 0) {
      toast.error("Enter valid reps.");
      return;
    }
    // Convert display units to kg for internal storage
    const wKg = toKg(wDisplay);
    const set: LoggedSet = { weight: wKg, reps: r, rpe: inputRpe };
    setAllSets((prev) => {
      const updated = [...prev];
      updated[currentIdx] = [...(updated[currentIdx] ?? []), set];
      return updated;
    });
    // Update input to match logged set for quick next-set
    setInputWeight(wDisplay.toFixed(1));
    setInputRpe(null);
    startRestTimer(defaultRestSeconds);
  }

  // ── Skip Set ──────────────────────────────────────────────────────────────
  function handleSkipSet() {
    stopRestTimer();
  }

  // ── Navigate exercises ─────────────────────────────────────────────────────
  function handleNext() {
    stopRestTimer();
    if (currentIdx < exercises.length - 1) {
      setCurrentIdx((i) => i + 1);
    }
  }

  function handlePrev() {
    stopRestTimer();
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
    }
  }

  // ── Finish Workout ─────────────────────────────────────────────────────────
  async function handleFinishWorkout() {
    stopRestTimer();

    const setLogs: Array<[string, Array<import("../backend.d").SetLog>]> =
      exercises.map((ex, i) => [
        ex.exerciseId,
        (allSets[i] ?? []).map((s, si) => ({
          setNumber: BigInt(si + 1),
          repsCompleted: BigInt(s.reps),
          weightUsed: s.weight,
          ...(s.rpe !== null ? { rpe: BigInt(s.rpe) } : {}),
        })),
      ]);

    const totalVolume = setLogs.reduce(
      (acc, [, sets]) =>
        acc +
        sets.reduce((a, s) => a + s.weightUsed * Number(s.repsCompleted), 0),
      0,
    );

    try {
      await logWorkout({
        exercises,
        setLogs,
        timestamp: BigInt(Date.now()) * BigInt(1_000_000),
        totalVolume,
        note: "",
        workoutType,
      });
      setIsComplete(true);
    } catch (e) {
      toast.error(
        `Failed to save: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  }

  // ── Progress ───────────────────────────────────────────────────────────────
  const isLastExercise = currentIdx === exercises.length - 1;
  const progressPct = ((currentIdx + 1) / exercises.length) * 100;
  const allSetsTargetDone = isLastExercise && currentSets.length >= targetSets;

  // ── Completion screen ──────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <CompletionScreen
        exercises={exercises}
        allSets={allSets}
        elapsedSeconds={elapsedSeconds}
        onFinish={onFinish}
        formatWeight={formatWeight}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-3 pb-2 shadow-subtle">
        <div className="flex items-center justify-between mb-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs text-muted-foreground font-medium">
                {currentIdx + 1} / {exercises.length}
              </span>
              <span className="movement-pill">{currentExercise.movement}</span>
            </div>
            <h2 className="text-lg font-display font-bold text-foreground leading-tight truncate">
              {currentExercise.name}
            </h2>
            <p className="text-xs text-muted-foreground capitalize">
              {currentExercise.muscleGroup}
            </p>
          </div>
          <button
            type="button"
            data-ocid="workout.cancel_button"
            onClick={onCancel}
            aria-label="Cancel workout"
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <Progress
          value={progressPct}
          className="h-1"
          data-ocid="workout.progress_bar"
        />
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-4">
        {/* Target card */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Target
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-display font-bold text-accent">
                  {formatWeight(currentExercise.targetWeight)}
                </span>
                <span className="text-sm text-muted-foreground">{unit}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Plan
              </p>
              <p className="text-base font-display font-bold text-foreground">
                {targetSets} × {currentExercise.repRange}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentSets.length} / {targetSets} done
              </p>
            </div>
          </div>
          {/* Coach tip */}
          <div className="mt-3 pt-3 border-t border-border">
            <p
              className={`text-xs font-medium ${
                currentExercise.progressionFlag === "Increase weight"
                  ? "text-success"
                  : currentExercise.progressionFlag === "Deload"
                    ? "text-warning"
                    : "text-accent"
              }`}
            >
              {currentExercise.coachTip}
            </p>
          </div>
        </div>

        {/* Rest Timer */}
        <AnimatePresence>
          {isResting && (
            <RestTimer
              seconds={restSeconds}
              total={restTotal}
              onSkip={stopRestTimer}
              onAdjust={handleAdjustRest}
            />
          )}
        </AnimatePresence>

        {/* Logged sets list */}
        {currentSets.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Logged Sets
            </p>
            <div
              className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden"
              data-ocid="workout.set.list"
            >
              {currentSets.map((s, setIdx) => (
                <motion.div
                  key={`logged-${currentIdx}-${setIdx}-${s.weight}-${s.reps}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  data-ocid={`workout.set.item.${setIdx + 1}`}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <span className="text-xs text-muted-foreground w-12 shrink-0">
                    Set {setIdx + 1}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatWeight(s.weight)}
                  </span>
                  <span className="text-sm text-foreground">{s.reps} reps</span>
                  {s.rpe !== null ? (
                    <span className="text-xs text-muted-foreground">
                      RPE {s.rpe}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground w-10" />
                  )}
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* New set input — hidden while resting */}
        <AnimatePresence>
          {!isResting && setsRemaining > 0 && (
            <motion.div
              key="set-input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Set {currentSets.length + 1}
                </p>
                {setsRemaining > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {setsRemaining - 1} more after this
                  </span>
                )}
              </div>

              {/* Weight + Reps */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Weight ({unit})
                  </p>
                  <Input
                    data-ocid="workout.weight_input"
                    type="number"
                    inputMode="decimal"
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value)}
                    className="bg-secondary/50 border-border text-foreground h-11 text-base font-semibold"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Reps</p>
                  <Input
                    data-ocid="workout.reps_input"
                    type="number"
                    inputMode="numeric"
                    value={inputReps}
                    onChange={(e) => setInputReps(e.target.value)}
                    className="bg-secondary/50 border-border text-foreground h-11 text-base font-semibold"
                  />
                </div>
              </div>

              {/* RPE selector — 1 to 10 */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  RPE (optional)
                </p>
                <ScrollArea className="w-full">
                  <div className="flex gap-1.5 pb-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                      <button
                        key={r}
                        type="button"
                        data-ocid={`workout.rpe_${r}_toggle`}
                        onClick={() => setInputRpe(inputRpe === r ? null : r)}
                        className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-colors shrink-0 ${
                          inputRpe === r
                            ? "bg-accent text-accent-foreground border-accent"
                            : r >= 9
                              ? "bg-secondary/50 text-destructive border-destructive/30 hover:border-destructive/60"
                              : r >= 7
                                ? "bg-secondary/50 text-warning border-warning/30 hover:border-warning/60"
                                : "bg-secondary/50 text-muted-foreground border-border hover:border-accent/40"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  data-ocid="workout.skip_set_button"
                  variant="outline"
                  size="sm"
                  className="flex-1 border-border text-muted-foreground hover:text-foreground"
                  onClick={handleSkipSet}
                >
                  Skip Set
                </Button>
                <Button
                  data-ocid="workout.log_set_button"
                  className="flex-[2] h-10 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                  onClick={handleLogSet}
                >
                  Log Set
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* All sets done for this exercise (but not last exercise) */}
        {!isResting && setsRemaining === 0 && !isLastExercise && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-success/10 border border-success/30 rounded-xl p-4 text-center"
          >
            <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
            <p className="text-sm font-semibold text-success">
              All {targetSets} sets done!
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Move to the next exercise when ready.
            </p>
          </motion.div>
        )}
      </main>

      {/* ── Bottom bar ───────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-background border-t border-border space-y-2">
        {/* Prev / Next nav */}
        <div className="flex gap-2">
          <button
            type="button"
            data-ocid="workout.prev_exercise_button"
            onClick={handlePrev}
            disabled={currentIdx === 0}
            aria-label="Previous exercise"
            className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {allSetsTargetDone || isLastExercise ? (
            <Button
              data-ocid="workout.finish_workout_button"
              className="flex-1 h-10 bg-success hover:bg-success/90 text-success-foreground font-semibold"
              onClick={handleFinishWorkout}
              disabled={isLogging}
            >
              {isLogging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Finish Workout
                </>
              )}
            </Button>
          ) : (
            <Button
              data-ocid="workout.next_exercise_button"
              className="flex-1 h-10 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              onClick={handleNext}
            >
              Next Exercise <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

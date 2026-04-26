import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Dumbbell,
  Flame,
  Settings,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import {
  useCoachRecommendation,
  useReadiness,
  useTrainingState,
  useWorkoutHistory,
} from "../hooks/useQueries";
import { useUnits } from "../hooks/useUnits";
import type { WorkoutType } from "../types";
import { workoutTypeLabel } from "../utils/workoutTypes";

interface Props {
  onStartWorkout: (wt: WorkoutType) => void;
  onNavigate: (tab: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  core: "Core",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
};

// Baseline recovery hours per spec
const MUSCLE_BASELINE: Record<string, number> = {
  chest: 72,
  back: 72,
  quads: 72,
  hamstrings: 72,
  glutes: 72,
  shoulders: 48,
  core: 48,
  calves: 48,
  arms: 36,
};

const WORKOUT_TILES: {
  label: string;
  type: WorkoutType;
  Icon: React.FC<{ className?: string }>;
}[] = [
  { label: "Upper Body", type: "upper", Icon: Dumbbell },
  { label: "Lower Body", type: "lower", Icon: Zap },
  { label: "Full Body", type: "fullBody", Icon: Flame },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function recoveryTextClass(pct: number) {
  if (pct >= 70) return "recovery-high";
  if (pct >= 40) return "recovery-med";
  return "recovery-low";
}

function recoveryBarClass(pct: number) {
  if (pct >= 70) return "recovery-bar-high";
  if (pct >= 40) return "recovery-bar-med";
  return "recovery-bar-low";
}

type FatigueLevel = "Low" | "Moderate" | "High" | "Critical";
function fatigueLevel(score: number): FatigueLevel {
  if (score <= 5) return "Low";
  if (score <= 12) return "Moderate";
  if (score <= 20) return "High";
  return "Critical";
}
function fatigueLevelClass(level: FatigueLevel) {
  if (level === "Low") return "recovery-high";
  if (level === "Moderate") return "recovery-med";
  if (level === "High") return "recovery-low";
  return "text-destructive";
}
function fatigueBgClass(level: FatigueLevel) {
  if (level === "Low") return "bg-success/15 border-success/30";
  if (level === "Moderate") return "bg-warning/15 border-warning/30";
  if (level === "High") return "bg-destructive/15 border-destructive/30";
  return "bg-destructive/25 border-destructive/50";
}

type Phase = "accumulation" | "intensification" | "deload";
function computePhase(weekNumber: number): Phase {
  const cycle = ((weekNumber - 1) % 4) + 1;
  if (cycle === 4) return "deload";
  if (cycle === 3) return "intensification";
  return "accumulation";
}
function phaseBadgeClass(phase: Phase) {
  if (phase === "accumulation")
    return "bg-accent/15 border-accent/30 text-accent";
  if (phase === "intensification")
    return "bg-warning/15 border-warning/30 text-warning";
  return "bg-success/15 border-success/30 text-success";
}
function phaseLabel(phase: Phase) {
  if (phase === "accumulation") return "Accumulation";
  if (phase === "intensification") return "Intensification";
  return "Deload";
}

function relativeTime(ms: number): string {
  const now = Date.now();
  const diffMs = now - ms;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHrs / 24);
  if (diffMs < 0) return "Now";
  if (diffHrs < 1) return "< 1h ago";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecoveryBar({ pct }: { pct: number }) {
  return (
    <div className="flex-1 h-1.5 bg-track rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${recoveryBarClass(pct)}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function SkeletonCard() {
  return <Skeleton className="h-28 w-full rounded-lg" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardScreen({ onStartWorkout, onNavigate }: Props) {
  const {
    data: readiness,
    isLoading: readinessLoading,
    isError: readinessError,
  } = useReadiness();
  const { data: rec, isLoading: recLoading } = useCoachRecommendation();
  const { data: trainingState, isLoading: tsLoading } = useTrainingState();
  const { data: history, isLoading: histLoading } = useWorkoutHistory(0, 3);
  const { formatWeight } = useUnits();

  const weekNumber = trainingState ? Number(trainingState.weekNumber) : 1;
  const fatigueScore = trainingState ? Number(trainingState.fatigueScore) : 0;
  const phase = computePhase(weekNumber);
  const fatigue = fatigueLevel(fatigueScore);

  const avgRecovery =
    readiness && readiness.length > 0
      ? Math.round(
          readiness.reduce((a, r) => a + Number(r.recoveryPct), 0) /
            readiness.length,
        )
      : null;

  function formatSessionDate(ts: bigint) {
    const d = new Date(Number(ts) / 1_000_000);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // Last trained timestamp per muscle from history
  const lastTrainedMap: Record<string, number> = {};
  if (history) {
    for (const session of history) {
      const ts = Number(session.timestamp) / 1_000_000;
      for (const ex of session.exercises) {
        const mg = ex.muscleGroup;
        if (!lastTrainedMap[mg] || ts > lastTrainedMap[mg]) {
          lastTrainedMap[mg] = ts;
        }
      }
    }
  }

  const isHeaderLoading = tsLoading;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Dumbbell className="w-3.5 h-3.5 text-accent" />
          </div>
          <span className="text-base font-display font-bold text-foreground tracking-tight">
            CaffeineCoach
          </span>
          {/* Phase badge */}
          {!isHeaderLoading && (
            <span
              className={`phase-badge border ${phaseBadgeClass(phase)}`}
              data-ocid="dashboard.phase_badge"
            >
              {phaseLabel(phase)}
            </span>
          )}
          {isHeaderLoading && <Skeleton className="h-5 w-20 rounded-md" />}
        </div>
        <div className="flex items-center gap-2">
          {/* Fatigue indicator */}
          {!isHeaderLoading && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${fatigueBgClass(fatigue)}`}
              data-ocid="dashboard.fatigue_indicator"
            >
              <Activity className="w-3 h-3" />
              <span className={fatigueLevelClass(fatigue)}>
                {fatigueScore} · {fatigue}
              </span>
            </div>
          )}
          <button
            type="button"
            data-ocid="dashboard.settings_button"
            onClick={() => onNavigate("profile")}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">
        {/* Coach Recommendation */}
        {recLoading ? (
          <SkeletonCard data-ocid="dashboard.loading_state" />
        ) : rec ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card border border-border rounded-lg p-4"
            data-ocid="dashboard.recommendation_card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Today's Recommendation
                </p>
                <h2 className="text-xl font-display font-bold text-foreground leading-tight">
                  {workoutTypeLabel(rec.workoutType as WorkoutType)}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {rec.reason}
                </p>
              </div>
              {avgRecovery !== null && (
                <div className="flex-shrink-0 text-right">
                  <span
                    className={`text-2xl font-bold font-display ${recoveryTextClass(avgRecovery)}`}
                  >
                    {avgRecovery}%
                  </span>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
                    Readiness
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <div
            data-ocid="dashboard.recommendation.error_state"
            className="bg-card border border-border rounded-lg px-4 py-5 flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Coach data unavailable — start any workout to build your profile.
            </p>
          </div>
        )}

        {/* Quick Start Buttons */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Start Workout
          </p>
          <div className="grid grid-cols-3 gap-2">
            {WORKOUT_TILES.map(({ label, type, Icon }, idx) => {
              const isRec = rec && rec.workoutType === type;
              return (
                <motion.button
                  key={type}
                  type="button"
                  data-ocid={`dashboard.start_${type}_button`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: idx * 0.07 }}
                  onClick={() => onStartWorkout(type)}
                  className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                    isRec
                      ? "bg-accent/15 border-accent/50 text-accent"
                      : "bg-card border-border text-muted-foreground hover:border-accent/40 hover:text-foreground"
                  }`}
                >
                  {isRec && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" />
                  )}
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-semibold leading-tight text-center">
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Muscle Readiness Grid */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Muscle Readiness
          </p>
          {readinessLoading ? (
            <div className="space-y-1">
              {[
                "chest",
                "back",
                "shoulders",
                "arms",
                "core",
                "quads",
                "hamstrings",
                "glutes",
                "calves",
              ].map((mg) => (
                <Skeleton key={mg} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : readinessError ? (
            <div
              data-ocid="dashboard.readiness.error_state"
              className="bg-card border border-border rounded-lg px-4 py-5 flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Recovery data unavailable. Log a workout to start tracking.
              </p>
            </div>
          ) : readiness && readiness.length > 0 ? (
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {readiness.map((item, i) => {
                const pct = Number(item.recoveryPct);
                const lastMs = lastTrainedMap[item.muscleGroup];
                const baseline = MUSCLE_BASELINE[item.muscleGroup] ?? 72;
                // Compute estimated hours since last trained from recovery %
                // recoveryPct = min(100, (hrs / baseline) * 100)
                // hrs = pct / 100 * baseline (capped at baseline)
                const hrsAgo = Math.min((pct / 100) * baseline, baseline);
                const lastTrainedDisplay = lastMs
                  ? relativeTime(lastMs)
                  : pct >= 100
                    ? `>${baseline}h ago`
                    : `~${Math.round(hrsAgo)}h ago`;

                return (
                  <motion.div
                    key={item.muscleGroup}
                    data-ocid={`dashboard.readiness.item.${i + 1}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22, delay: i * 0.04 }}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <div className="w-[88px] flex-shrink-0">
                      <span className="text-sm text-foreground font-medium block leading-tight">
                        {MUSCLE_LABELS[item.muscleGroup] ?? item.muscleGroup}
                      </span>
                      <span className="text-xs text-muted-foreground leading-tight">
                        {lastTrainedDisplay}
                      </span>
                    </div>
                    <RecoveryBar pct={pct} />
                    <span
                      className={`text-sm font-bold w-10 text-right flex-shrink-0 ${recoveryTextClass(pct)}`}
                    >
                      {pct}%
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div
              data-ocid="dashboard.readiness.empty_state"
              className="bg-card border border-border rounded-lg px-4 py-6 text-center"
            >
              <Activity className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No recovery data yet. Log your first workout to start tracking.
              </p>
            </div>
          )}
        </div>

        {/* Training State Card */}
        {!tsLoading && trainingState && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-card border border-border rounded-lg p-4"
            data-ocid="dashboard.training_state_card"
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
              Training State
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p
                  className={`text-2xl font-bold font-display ${
                    phaseBadgeClass(phase)
                      .split(" ")
                      .find((c) => c.startsWith("text-")) ?? "text-accent"
                  }`}
                >
                  W{weekNumber}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Week</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold font-display text-foreground capitalize">
                  {phase === "accumulation"
                    ? "Accum."
                    : phase === "intensification"
                      ? "Intense"
                      : "Deload"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Phase</p>
              </div>
              <div className="text-center">
                <p
                  className={`text-2xl font-bold font-display ${fatigueLevelClass(fatigue)}`}
                >
                  {fatigueScore}
                </p>
                <p
                  className={`text-xs mt-0.5 font-medium ${fatigueLevelClass(fatigue)}`}
                >
                  {fatigue}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recent Workouts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Recent Sessions
            </p>
            <button
              type="button"
              data-ocid="dashboard.history_link"
              onClick={() => onNavigate("history")}
              className="text-xs text-accent flex items-center gap-0.5 hover:underline transition-colors"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {histLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : history && history.length > 0 ? (
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {history.map((session, i) => (
                <div
                  key={`recent-${Number(session.timestamp)}-${i}`}
                  data-ocid={`dashboard.recent.item.${i + 1}`}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      {workoutTypeLabel(session.workoutType as WorkoutType)}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatSessionDate(session.timestamp)} ·{" "}
                      {session.exercises.length} exercises
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-foreground">
                      {formatWeight(session.totalVolume)}
                    </span>
                    <p className="text-xs text-muted-foreground">volume</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              data-ocid="dashboard.recent.empty_state"
              className="bg-card border border-border rounded-lg px-4 py-6 text-center"
            >
              <TrendingUp className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No workouts yet. Time to crush it!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center py-2">
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            © {new Date().getFullYear()}. Built with ♥ using caffeine.ai
          </a>
        </footer>
      </main>
    </div>
  );
}

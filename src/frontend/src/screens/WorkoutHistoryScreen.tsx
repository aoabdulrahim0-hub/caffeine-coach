import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Dumbbell,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useWorkoutHistory } from "../hooks/useQueries";
import { useUnits } from "../hooks/useUnits";
import type { WorkoutSession, WorkoutType } from "../types";
import { workoutTypeLabel } from "../utils/workoutTypes";

const PAGE_SIZE = 10;

const WORKOUT_TYPE_COLORS: Record<WorkoutType, string> = {
  upper: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  lower: "bg-green-500/15 text-green-400 border-green-500/30",
  fullBody: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

function formatDate(ts: bigint): string {
  const d = new Date(Number(ts) / 1_000_000);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(ts: bigint): string {
  const d = new Date(Number(ts) / 1_000_000);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getPBExercises(session: WorkoutSession): string[] {
  if (!session.setLogs || session.setLogs.length === 0) return [];
  // Top 2 by max weight used per exercise
  const tops = session.setLogs
    .map(([id, sets]) => ({
      id,
      maxWeight: sets.reduce((m, s) => Math.max(m, s.weightUsed), 0),
    }))
    .sort((a, b) => b.maxWeight - a.maxWeight)
    .slice(0, 2);
  return tops.map((t) =>
    t.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  );
}

export default function WorkoutHistoryScreen() {
  const [page, setPage] = useState(0);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const { data: sessions, isLoading } = useWorkoutHistory(
    page * PAGE_SIZE,
    PAGE_SIZE,
  );
  const { formatWeight } = useUnits();

  const hasMore = !!sessions && sessions.length === PAGE_SIZE;

  function toggleExpand(idx: number) {
    setExpandedIdx((prev) => (prev === idx ? null : idx));
    // Close when changing page
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setExpandedIdx(null);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 shadow-subtle">
        <h1 className="text-lg font-display font-bold text-foreground">
          Workout History
        </h1>
        {sessions && sessions.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Page {page + 1} · {sessions.length} sessions
          </p>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {isLoading ? (
          <div className="space-y-3" data-ocid="history.loading_state">
            {["s1", "s2", "s3", "s4"].map((k) => (
              <Skeleton key={k} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <motion.div
            data-ocid="history.empty_state"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
              <Dumbbell className="w-8 h-8 text-accent/50" />
            </div>
            <p className="text-foreground font-semibold">No workouts yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Start your first session — your training history will appear here.
            </p>
          </motion.div>
        ) : (
          <>
            {sessions.map((session, idx) => {
              const wt = session.workoutType as WorkoutType;
              const badgeClass =
                WORKOUT_TYPE_COLORS[wt] ??
                "bg-secondary text-muted-foreground border-border";
              const isExpanded = expandedIdx === idx;
              const sessionKey = `${Number(session.timestamp)}-${idx}`;
              const pbExercises = getPBExercises(session);

              return (
                <motion.div
                  key={sessionKey}
                  data-ocid={`history.item.${idx + 1}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  {/* Session header */}
                  <button
                    type="button"
                    data-ocid={`history.expand.${idx + 1}_button`}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                    onClick={() => toggleExpand(idx)}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="text-left min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${badgeClass}`}
                          >
                            {workoutTypeLabel(wt)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {session.exercises.length} exercises
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(session.timestamp)} ·{" "}
                          {formatTime(session.timestamp)}
                        </p>
                        {pbExercises.length > 0 && (
                          <p className="text-xs text-accent/80 mt-1 truncate">
                            Top: {pbExercises.join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-foreground">
                          {formatWeight(session.totalVolume)}
                        </span>
                        <p className="text-xs text-muted-foreground">volume</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded exercise details with set logs */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border bg-background/40"
                    >
                      {session.setLogs.length > 0
                        ? session.setLogs.map(([exerciseId, sets]) => {
                            const exName = exerciseId
                              .replace(/-/g, " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase());
                            const maxSet = sets.reduce(
                              (best, s) =>
                                s.weightUsed > best.weightUsed ? s : best,
                              sets[0],
                            );
                            return (
                              <div
                                key={`${sessionKey}-ex-${exerciseId}`}
                                className="px-4 py-3 border-b border-border last:border-b-0"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-semibold text-foreground">
                                    {exName}
                                  </p>
                                  {maxSet && (
                                    <span className="text-xs font-mono text-accent flex-shrink-0">
                                      {formatWeight(maxSet.weightUsed)} ×{" "}
                                      {Number(maxSet.repsCompleted)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                                  {sets.map((set) => (
                                    <span
                                      key={`${sessionKey}-${exerciseId}-set-${Number(set.setNumber)}`}
                                      className="text-xs text-muted-foreground"
                                    >
                                      <span className="text-foreground/70">
                                        S{Number(set.setNumber)}
                                      </span>{" "}
                                      {formatWeight(set.weightUsed)} ×{" "}
                                      {Number(set.repsCompleted)}
                                      {set.rpe !== undefined && (
                                        <span className="text-muted-foreground/60">
                                          {" "}
                                          RPE {Number(set.rpe)}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        : session.exercises.map((ex) => (
                            <div
                              key={`${sessionKey}-ex-${ex.exerciseId}`}
                              className="px-4 py-3 border-b border-border last:border-b-0"
                            >
                              <p className="text-sm font-semibold text-foreground">
                                {ex.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {Number(ex.sets)} sets · {ex.repRange} @{" "}
                                {formatWeight(ex.targetWeight)}
                              </p>
                            </div>
                          ))}
                      {session.note && (
                        <div className="px-4 py-2.5 border-t border-border">
                          <p className="text-xs text-muted-foreground italic">
                            "{session.note}"
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2">
              <Button
                data-ocid="history.pagination_prev"
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(0, page - 1))}
                disabled={page === 0}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground font-mono">
                Page {page + 1}
              </span>
              <Button
                data-ocid="history.pagination_next"
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={!hasMore}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

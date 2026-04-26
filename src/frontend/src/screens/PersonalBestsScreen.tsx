import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useExercises, usePersonalBests } from "../hooks/useQueries";
import { useUnits } from "../hooks/useUnits";

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

const TROPHY_COLORS = [
  "text-yellow-400",
  "text-zinc-400",
  "text-amber-600",
] as const;

function formatDate(ts: bigint): string {
  const d = new Date(Number(ts) / 1_000_000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PersonalBestsScreen() {
  const { data: bestsMap, isLoading: pbsLoading } = usePersonalBests();
  const { data: exercises, isLoading: exLoading } = useExercises();
  const { formatWeight } = useUnits();

  // Build lookup: exerciseId → { name, muscleGroup }
  const exerciseMap: Record<string, { name: string; muscleGroup: string }> = {};
  if (exercises) {
    for (const ex of exercises) {
      exerciseMap[ex.id] = { name: ex.name, muscleGroup: ex.muscleGroup };
    }
  }

  // Convert map to sorted array — highest est1RM first
  const bests = bestsMap
    ? Object.values(bestsMap).sort((a, b) => b.est1RM - a.est1RM)
    : [];

  const isLoading = pbsLoading || exLoading;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 shadow-subtle">
        <h1 className="text-lg font-display font-bold text-foreground">
          Personal Bests
        </h1>
        {bests.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {bests.length} exercise{bests.length !== 1 ? "s" : ""} tracked
          </p>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {isLoading ? (
          <div className="space-y-3" data-ocid="pbs.loading_state">
            {["pb1", "pb2", "pb3", "pb4", "pb5"].map((k) => (
              <Skeleton key={k} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : bests.length === 0 ? (
          <motion.div
            data-ocid="pbs.empty_state"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-accent/50" />
            </div>
            <p className="text-foreground font-semibold">
              No personal bests yet
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Log your first workout to start tracking your strength records.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {bests.map((pb, idx) => {
              const exInfo = exerciseMap[pb.exerciseId];
              const displayName =
                exInfo?.name ??
                pb.exerciseId
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());
              const muscle = exInfo?.muscleGroup ?? "";
              const muscleBadge =
                MUSCLE_COLORS[muscle] ??
                "bg-secondary text-muted-foreground border-border";
              const isTop3 = idx < 3;
              const trophyColor = TROPHY_COLORS[idx];

              return (
                <motion.div
                  key={pb.exerciseId}
                  data-ocid={`pbs.item.${idx + 1}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx, 8) * 0.04 }}
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isTop3 && trophyColor && (
                          <Trophy
                            className={`w-4 h-4 flex-shrink-0 ${trophyColor}`}
                          />
                        )}
                        {!isTop3 && (
                          <span className="text-xs font-mono text-muted-foreground/50 w-4 text-center flex-shrink-0">
                            {idx + 1}
                          </span>
                        )}
                        <span className="text-sm font-bold text-foreground truncate">
                          {displayName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {muscle && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border font-medium ${muscleBadge}`}
                          >
                            {muscle}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(pb.achievedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Best set: weight × reps */}
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-lg font-display font-bold text-foreground">
                          {formatWeight(pb.weight)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        × {Number(pb.reps)} reps
                      </p>
                    </div>
                  </div>

                  {/* Est 1RM row */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      Est. 1RM
                    </span>
                    <span className="text-sm font-bold font-mono text-accent">
                      {formatWeight(pb.est1RM)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

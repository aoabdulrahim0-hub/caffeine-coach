import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Activity, Loader2, LogOut, Save, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExperienceLevel, Gender, Goal } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useSetUserProfile,
  useTrainingState,
  useUserProfile,
} from "../hooks/useQueries";
import { useUnits } from "../hooks/useUnits";

interface Props {
  onSaved?: () => void;
  isOnboarding?: boolean;
}

function computePhase(weekNumber: number): string {
  const cycle = ((weekNumber - 1) % 4) + 1;
  if (cycle === 1 || cycle === 2) return "Accumulation";
  if (cycle === 3) return "Intensification";
  return "Deload";
}

function fatigueLevelLabel(score: number): {
  label: string;
  className: string;
} {
  if (score === 0) return { label: "Fresh", className: "text-success" };
  if (score <= 5) return { label: "Low", className: "text-success" };
  if (score <= 10) return { label: "Moderate", className: "text-warning" };
  if (score <= 20) return { label: "High", className: "recovery-low" };
  return { label: "Overreached — Deload", className: "recovery-low" };
}

export default function ProfileScreen({ onSaved, isOnboarding }: Props) {
  const { identity, clear } = useInternetIdentity();
  const { data: profile } = useUserProfile();
  const { data: trainingState } = useTrainingState();
  const { mutateAsync: saveProfile, isPending } = useSetUserProfile();
  const { unit, setUnit } = useUnits();

  const unitRef = useRef(unit);
  useEffect(() => {
    unitRef.current = unit;
  }, [unit]);

  const principal = identity?.getPrincipal().toString() ?? "";
  const shortPrincipal = principal
    ? `${principal.slice(0, 10)}...${principal.slice(-4)}`
    : "";

  const [gender, setGender] = useState<Gender>(profile?.gender ?? Gender.male);
  const [experience, setExperience] = useState<ExperienceLevel>(
    profile?.experienceLevel ?? ExperienceLevel.beginner,
  );
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? Goal.hypertrophy);
  const [bodyweight, setBodyweight] = useState<string>(
    profile
      ? String(
          unit === "lbs"
            ? Math.round(profile.bodyweightKg * 2.20462)
            : profile.bodyweightKg,
        )
      : "",
  );
  const [restTimer, setRestTimer] = useState<number>(
    profile ? Number(profile.restTimerSeconds) : 90,
  );

  // Sync form fields when profile data loads after mount
  useEffect(() => {
    if (!profile) return;
    setGender(profile.gender);
    setExperience(profile.experienceLevel);
    setGoal(profile.goal);
    setBodyweight(
      String(
        unitRef.current === "lbs"
          ? Math.round(profile.bodyweightKg * 2.20462)
          : profile.bodyweightKg,
      ),
    );
    setRestTimer(Number(profile.restTimerSeconds));
  }, [profile]);

  async function handleSave() {
    const bwVal = Number.parseFloat(bodyweight);
    if (Number.isNaN(bwVal) || bwVal <= 0) {
      toast.error("Enter a valid bodyweight.");
      return;
    }
    const bwKg = unit === "lbs" ? bwVal / 2.20462 : bwVal;
    if (bwKg < 30 || bwKg > 200) {
      toast.error("Bodyweight must be between 30–200 kg (66–440 lbs).");
      return;
    }
    if (restTimer < 30 || restTimer > 300) {
      toast.error("Rest timer must be between 30–300 seconds.");
      return;
    }
    try {
      await saveProfile({
        gender,
        experienceLevel: experience,
        goal,
        bodyweightKg: bwKg,
        restTimerSeconds: BigInt(restTimer),
      });
      toast.success("Profile saved!");
      onSaved?.();
    } catch (e) {
      toast.error(
        `Failed to save: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  }

  const genderOptions: { label: string; value: Gender }[] = [
    { label: "Male", value: Gender.male },
    { label: "Female", value: Gender.female },
  ];

  const expOptions: { label: string; value: ExperienceLevel }[] = [
    { label: "Beginner", value: ExperienceLevel.beginner },
    { label: "Intermediate", value: ExperienceLevel.intermediate },
    { label: "Advanced", value: ExperienceLevel.advanced },
  ];

  const goalOptions: { label: string; value: Goal; desc: string }[] = [
    { label: "Strength", value: Goal.strength, desc: "3–6 reps" },
    { label: "Hypertrophy", value: Goal.hypertrophy, desc: "8–12 reps" },
    { label: "Quick", value: Goal.quick, desc: "12–15 reps" },
  ];

  const formatRestLabel = (s: number) =>
    s >= 60
      ? `${Math.floor(s / 60)}m ${s % 60 > 0 ? `${s % 60}s` : ""}`.trim()
      : `${s}s`;

  // Training state derived values
  const weekNum = trainingState ? Number(trainingState.weekNumber) : null;
  const fatigueScore = trainingState
    ? Number(trainingState.fatigueScore)
    : null;
  const phase = weekNum != null ? computePhase(weekNum) : null;
  const cycleWeek = weekNum != null ? ((weekNum - 1) % 4) + 1 : null;
  const fatigueInfo =
    fatigueScore != null ? fatigueLevelLabel(fatigueScore) : null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3 shadow-subtle">
        {isOnboarding ? (
          <div className="flex-1">
            <h1 className="text-lg font-display font-bold text-foreground">
              Profile Setup
            </h1>
            <p className="text-xs text-muted-foreground">
              Complete your profile to get started
            </p>
          </div>
        ) : (
          <h1 className="flex-1 text-lg font-display font-bold text-foreground">
            Profile
          </h1>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Identity Card */}
          {!isOnboarding && (
            <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
                <span className="text-accent text-sm font-bold">ID</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Principal
                </p>
                <p className="text-sm font-mono text-foreground truncate">
                  {shortPrincipal}
                </p>
              </div>
            </div>
          )}

          {/* Training State — read-only, only shown when data is available and not onboarding */}
          {!isOnboarding && trainingState && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Training State
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {/* Week */}
                <div className="bg-secondary/40 rounded-md p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Week</p>
                  <p className="text-xl font-display font-bold text-foreground leading-none">
                    {weekNum ?? "—"}
                  </p>
                </div>
                {/* Cycle */}
                <div className="bg-secondary/40 rounded-md p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Cycle</p>
                  <p className="text-xl font-display font-bold text-foreground leading-none">
                    {cycleWeek != null ? `W${cycleWeek}` : "—"}
                  </p>
                </div>
                {/* Fatigue */}
                <div className="bg-secondary/40 rounded-md p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Fatigue</p>
                  <p
                    className={`text-xl font-display font-bold leading-none ${
                      fatigueInfo?.className ?? "text-foreground"
                    }`}
                  >
                    {fatigueScore ?? "—"}
                  </p>
                </div>
              </div>

              {/* Phase badge + fatigue label row */}
              <div className="flex items-center justify-between pt-1">
                {phase && (
                  <span
                    className={`phase-badge ${
                      phase === "Accumulation"
                        ? "phase-accumulation"
                        : phase === "Intensification"
                          ? "phase-intensification"
                          : "phase-deload"
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    {phase}
                  </span>
                )}
                {fatigueInfo && (
                  <span
                    className={`text-xs font-semibold ${fatigueInfo.className}`}
                  >
                    {fatigueInfo.label}
                  </span>
                )}
              </div>

              {fatigueScore != null && fatigueScore > 20 && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                  <p className="text-xs text-destructive font-medium">
                    Fatigue is high — a deload session is recommended.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Units */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Units
            </p>
            <div className="flex gap-2">
              {(["kg", "lbs"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  data-ocid={`profile.${u}_toggle`}
                  onClick={() => setUnit(u)}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-colors ${
                    unit === u
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-secondary/50 text-muted-foreground border-border hover:border-accent/50"
                  }`}
                >
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Gender
            </p>
            <div className="flex gap-2">
              {genderOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  data-ocid={`profile.gender_${opt.label.toLowerCase()}_toggle`}
                  onClick={() => setGender(opt.value)}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-colors ${
                    gender === opt.value
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-secondary/50 text-muted-foreground border-border hover:border-accent/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Experience Level
            </p>
            <div className="flex gap-2">
              {expOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  data-ocid={`profile.exp_${opt.label.toLowerCase()}_toggle`}
                  onClick={() => setExperience(opt.value)}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-colors ${
                    experience === opt.value
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-secondary/50 text-muted-foreground border-border hover:border-accent/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Training Goal
            </p>
            <div className="flex gap-2">
              {goalOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  data-ocid={`profile.goal_${opt.label.toLowerCase()}_toggle`}
                  onClick={() => setGoal(opt.value)}
                  className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-md text-sm font-semibold border transition-colors ${
                    goal === opt.value
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-secondary/50 text-muted-foreground border-border hover:border-accent/50"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="text-[10px] font-normal opacity-70 leading-tight mt-0.5">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bodyweight */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <Label
              htmlFor="bodyweight"
              className="text-xs uppercase tracking-wider text-muted-foreground font-semibold"
            >
              Bodyweight ({unit})
            </Label>
            <Input
              id="bodyweight"
              data-ocid="profile.bodyweight_input"
              type="number"
              inputMode="decimal"
              placeholder={unit === "kg" ? "e.g. 80" : "e.g. 176"}
              value={bodyweight}
              onChange={(e) => setBodyweight(e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground h-10"
            />
            <p className="text-xs text-muted-foreground">
              Valid range: {unit === "kg" ? "30–200 kg" : "66–440 lbs"}
            </p>
          </div>

          {/* Rest Timer */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Rest Timer
              </p>
              <span className="text-sm font-bold font-mono text-accent">
                {formatRestLabel(restTimer)}
              </span>
            </div>
            <Slider
              data-ocid="profile.rest_timer_input"
              min={30}
              max={300}
              step={15}
              value={[restTimer]}
              onValueChange={([v]) => setRestTimer(v)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>30s</span>
              <span>2m 30s</span>
              <span>5m</span>
            </div>
          </div>

          {/* Save */}
          <Button
            data-ocid="profile.submit_button"
            onClick={handleSave}
            disabled={isPending}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 font-semibold text-base"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isPending
              ? "Saving..."
              : isOnboarding
                ? "Complete Setup"
                : "Save Profile"}
          </Button>

          {/* Logout */}
          {!isOnboarding && (
            <Button
              data-ocid="profile.logout_button"
              variant="outline"
              onClick={clear}
              className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-secondary h-11"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          )}

          {isOnboarding && (
            <p className="text-xs text-muted-foreground text-center">
              You can update these anytime in the Profile tab.
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}

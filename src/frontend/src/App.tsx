import { Toaster } from "@/components/ui/sonner";
import { Clock, Home, Trophy, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useUserProfile } from "./hooks/useQueries";
import ActiveWorkoutLogger from "./screens/ActiveWorkoutLogger";
import DashboardScreen from "./screens/DashboardScreen";
import LoginScreen from "./screens/LoginScreen";
import PersonalBestsScreen from "./screens/PersonalBestsScreen";
import PreWorkoutReviewScreen from "./screens/PreWorkoutReviewScreen";
import ProfileScreen from "./screens/ProfileScreen";
import WorkoutHistoryScreen from "./screens/WorkoutHistoryScreen";
import type { SmartExercise, SmartMenuResult, WorkoutType } from "./types";

type Tab = "dashboard" | "history" | "pbs" | "profile";

type WorkoutState =
  | { phase: "idle" }
  | { phase: "review"; workoutType: WorkoutType }
  | {
      phase: "active";
      workoutType: WorkoutType;
      exercises: SmartExercise[];
      smartMenuResult?: SmartMenuResult;
    };

const NAV_TABS: {
  id: Tab;
  label: string;
  Icon: React.FC<{ className?: string }>;
}[] = [
  { id: "dashboard", label: "Home", Icon: Home },
  { id: "history", label: "History", Icon: Clock },
  { id: "pbs", label: "PRs", Icon: Trophy },
  { id: "profile", label: "Profile", Icon: User },
];

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: profile, isLoading: profileLoading } = useUserProfile();

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [workoutState, setWorkoutState] = useState<WorkoutState>({
    phase: "idle",
  });

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  // Loading state
  if (isInitializing || (isAuthenticated && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth gate
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        <Toaster richColors />
      </>
    );
  }

  // Profile setup (first run)
  if (profile === null && !profileLoading) {
    return (
      <>
        <ProfileScreen
          isOnboarding
          onSaved={() => {
            setActiveTab("dashboard");
          }}
        />
        <Toaster richColors />
      </>
    );
  }

  // Pre-Workout Review — pass workoutType; the screen fetches its own smartMenu
  if (workoutState.phase === "review") {
    return (
      <>
        <PreWorkoutReviewScreen
          workoutType={workoutState.workoutType}
          onBack={() => setWorkoutState({ phase: "idle" })}
          onBeginWorkout={(exercises, smartMenuResult) =>
            setWorkoutState({
              phase: "active",
              workoutType: workoutState.workoutType,
              exercises,
              smartMenuResult,
            })
          }
        />
        <Toaster richColors />
      </>
    );
  }

  // Active workout
  if (workoutState.phase === "active") {
    return (
      <>
        <ActiveWorkoutLogger
          exercises={workoutState.exercises}
          workoutType={workoutState.workoutType}
          onFinish={() => {
            setWorkoutState({ phase: "idle" });
            setActiveTab("dashboard");
          }}
          onCancel={() => setWorkoutState({ phase: "idle" })}
        />
        <Toaster richColors />
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto relative">
      {/* Main content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex-1 pb-16"
        >
          {activeTab === "dashboard" && (
            <DashboardScreen
              onStartWorkout={(wt) =>
                setWorkoutState({ phase: "review", workoutType: wt })
              }
              onNavigate={(tab) => setActiveTab(tab as Tab)}
            />
          )}
          {activeTab === "history" && <WorkoutHistoryScreen />}
          {activeTab === "pbs" && <PersonalBestsScreen />}
          {activeTab === "profile" && <ProfileScreen />}
        </motion.div>
      </AnimatePresence>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-background border-t border-border flex items-stretch"
        data-ocid="nav.tab"
      >
        {NAV_TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              data-ocid={`nav.${id}_link`}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors relative ${
                isActive
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span
                className={`text-xs font-medium ${isActive ? "text-accent" : ""}`}
              >
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 w-8 h-0.5 bg-accent rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      <Toaster richColors />
    </div>
  );
}

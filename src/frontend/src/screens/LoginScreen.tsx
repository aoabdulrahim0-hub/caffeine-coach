import { Button } from "@/components/ui/button";
import { Activity, Dumbbell, Loader2, Shield, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Track your progress",
    desc: "Personal bests, 1RM estimates, and volume trends",
  },
  {
    icon: Activity,
    title: "Recover smarter",
    desc: "Recovery-aware programming based on muscle readiness",
  },
  {
    icon: Dumbbell,
    title: "Train harder",
    desc: "Phase-specific periodisation with smart target weights",
  },
];

export default function LoginScreen() {
  const { login, isLoggingIn, isInitializing } = useInternetIdentity();
  const isLoading = isLoggingIn || isInitializing;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-8 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-18 h-18 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center w-[72px] h-[72px]">
              <Dumbbell className="w-9 h-9 text-accent" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
              CaffeineCoach
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 leading-snug max-w-[220px]">
              Track your progress, recover smarter, train harder.
            </p>
          </div>
        </div>

        {/* Feature list */}
        <div className="w-full bg-card border border-border rounded-xl p-4 space-y-4">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + i * 0.08 }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="w-full space-y-3">
          <Button
            data-ocid="auth.primary_button"
            size="lg"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base h-12"
            onClick={login}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isLoggingIn
              ? "Connecting..."
              : isInitializing
                ? "Initializing..."
                : "Connect with Internet Identity"}
          </Button>

          <div className="flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground/60">
              No passwords · Secured by Internet Identity
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

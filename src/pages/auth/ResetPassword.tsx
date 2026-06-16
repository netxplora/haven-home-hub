import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Supabase automatically picks up the token from the URL hash on this page
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecking(false);
    });
  }, []);

  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirm;
  const canSubmit = passwordValid && passwordsMatch && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } else {
      setDone(true);
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left Panel — Premium Brand Experience */}
      <div className="relative hidden lg:flex lg:flex-col lg:justify-center lg:items-center lg:p-14 overflow-hidden">
        {/* Animated Background Image */}
        <motion.div
          className="absolute inset-0 z-0 bg-[url('https://ilpbzriohwwnllpxndnl.supabase.co/storage/v1/object/public/public-assets/hero_luxury_penthouse.webp')] bg-cover bg-center"
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: "easeOut" }}
        />
        {/* Gradient Overlay: dark to transparent with subtle primary/orange tint */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-primary/20 backdrop-blur-[2px]" />

        {/* Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-20 flex flex-col items-center text-center w-full max-w-lg"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <Link to="/">
              <img src="/logo.png" alt="Haven Home Hub" className="h-12 w-auto invert drop-shadow-xl" />
            </Link>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="font-serif text-4xl lg:text-5xl font-bold leading-tight text-white tracking-tight drop-shadow-md"
          >
            Set a new password.
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="mt-6 text-lg text-white/80 leading-relaxed font-medium drop-shadow-sm max-w-md"
          >
            Choose a strong password to keep your account secure and protected.
          </motion.p>
        </motion.div>

        <div className="absolute bottom-8 left-0 right-0 text-center z-20">
          <p className="text-xs text-white/40 font-medium">© {new Date().getFullYear()} Haven Home Hub</p>
        </div>
      </div>

      {/* Right Panel — Recovery Form */}
      <div className="relative flex flex-col justify-center bg-slate-50 dark:bg-slate-950 px-6 py-14 sm:px-14 min-h-screen">
        {/* Mobile Logo & Hero (Visible only on mobile/tablet) */}
        <div className="lg:hidden relative w-full -mt-14 mb-8 rounded-b-[2rem] overflow-hidden shadow-xl">
          <div className="absolute inset-0 z-0 bg-[url('https://ilpbzriohwwnllpxndnl.supabase.co/storage/v1/object/public/public-assets/hero_luxury_penthouse.webp')] bg-cover bg-center" />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-primary/20" />
          <div className="relative z-20 flex flex-col items-center justify-center pt-20 pb-12 px-6 text-center">
            <Link to="/">
              <img src="/logo.png" alt="Haven Home Hub" className="h-10 w-auto invert drop-shadow-xl mb-6" />
            </Link>
            <h2 className="font-serif text-2xl font-bold leading-tight text-white tracking-tight drop-shadow-md">
              Set a new password.
            </h2>
          </div>
        </div>

        {/* Form Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto w-full max-w-[440px] rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 shadow-2xl shadow-primary/5 sm:p-10"
        >
          {!hasSession && !done ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 shadow-sm">
                <Lock className="h-7 w-7 text-destructive" />
              </div>
              <h1 className="font-serif text-3xl font-bold tracking-tight">Invalid or expired link</h1>
              <p className="text-muted-foreground leading-relaxed font-medium">
                This password reset link is no longer valid. Please request a new one.
              </p>
              <Button asChild className="h-12 rounded-xl font-bold w-full">
                <Link to="/forgot-password">Request new link</Link>
              </Button>
            </div>
          ) : done ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 shadow-sm">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="font-serif text-3xl font-bold tracking-tight">Password updated</h1>
              <p className="text-muted-foreground leading-relaxed font-medium">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <Button asChild className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                <Link to="/auth">Sign in to Dashboard</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-bold tracking-wide text-muted-foreground hover:text-foreground transition-colors mb-2">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-sm">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-3xl font-bold tracking-tight">Create new password</h1>
                <p className="mt-2 text-muted-foreground font-medium">
                  Your new password must be at least 8 characters long.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="rp-pwd" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">New password</Label>
                  <div className="relative">
                    <Input
                      id="rp-pwd"
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="h-12 rounded-xl focus-visible:ring-primary/50 pr-12 transition-all bg-background/50"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      onClick={() => setShowPwd(!showPwd)}
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && !passwordValid && (
                    <p className="text-xs text-destructive font-semibold">Must be at least 8 characters</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rp-confirm" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="rp-confirm"
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={8}
                      className="h-12 rounded-xl focus-visible:ring-primary/50 pr-12 transition-all bg-background/50"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      onClick={() => setShowConfirm(!showConfirm)}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirm.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-destructive font-semibold">Passwords do not match</p>
                  )}
                </div>

                <Button type="submit" disabled={!canSubmit} className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  {loading ? "Updating password..." : "Update password"}
                </Button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

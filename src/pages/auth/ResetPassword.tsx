import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Building2, ArrowLeft, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";

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
        <div className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 lg:text-primary-foreground">
        <Link to="/" className="flex items-center gap-2.5 font-serif text-xl font-semibold ">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground "><Building2 className="h-4 w-4" /></span>
          Verdant Estate
        </Link>
        <div>
          <h2 className="font-serif text-4xl font-semibold leading-tight">Set a new password.</h2>
          <p className="mt-3 text-primary-foreground/85">Choose a strong password to keep your account secure.</p>
        </div>
        <p className="text-sm text-primary-foreground/50">© {new Date().getFullYear()} Verdant Estate</p>
      </div>

      <div className="flex flex-col justify-center bg-background px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          {!hasSession && !done ? (
            <div className="space-y-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10">
                <Lock className="h-7 w-7 text-destructive" />
              </div>
              <h1 className="font-serif text-3xl font-semibold">Invalid or expired link</h1>
              <p className="text-muted-foreground leading-relaxed">
                This password reset link is no longer valid. Please request a new one.
              </p>
              <Button asChild>
                <Link to="/forgot-password">Request new link</Link>
              </Button>
            </div>
          ) : done ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h1 className="font-serif text-3xl font-semibold">Password updated</h1>
              <p className="text-muted-foreground leading-relaxed">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-3xl font-semibold">Create new password</h1>
                <p className="mt-2 text-muted-foreground">
                  Your new password must be at least 8 characters long.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rp-pwd">New password</Label>
                  <div className="relative">
                    <Input
                      id="rp-pwd"
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPwd(!showPwd)}
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && !passwordValid && (
                    <p className="text-xs text-destructive">Must be at least 8 characters</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rp-confirm">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="rp-confirm"
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowConfirm(!showConfirm)}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirm.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>

                <Button type="submit" disabled={!canSubmit} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

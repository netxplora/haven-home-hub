import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Building2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    // Always show success to prevent email enumeration
    setSent(true);
    if (error) {
      console.error("Password reset error:", error.message);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 lg:text-primary-foreground">
        <Link to="/" className="flex items-center gap-2.5 font-serif text-xl font-semibold ">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground "><Building2 className="h-4 w-4" /></span>
          Verdant Estate
        </Link>
        <div>
          <h2 className="font-serif text-4xl font-semibold leading-tight">Secure account recovery.</h2>
          <p className="mt-3 text-primary-foreground/85">We will send you a secure link to reset your password and regain access to your account.</p>
        </div>
        <p className="text-sm text-primary-foreground/50">© {new Date().getFullYear()} Verdant Estate</p>
      </div>

      <div className="flex flex-col justify-center bg-background px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>

          {sent ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h1 className="font-serif text-3xl font-semibold">Check your email</h1>
              <p className="text-muted-foreground leading-relaxed">
                If an account exists with <strong className="text-foreground">{email}</strong>, you will receive a password reset link shortly.
                Please check your inbox and spam folder.
              </p>
              <div className="flex gap-3">
                <Button asChild variant="outline">
                  <Link to="/auth">Return to sign in</Link>
                </Button>
                <Button variant="ghost" onClick={() => { setSent(false); setEmail(""); }}>
                  Try another email
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-3xl font-semibold">Reset your password</h1>
                <p className="mt-2 text-muted-foreground">
                  Enter the email address associated with your account and we will send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fp-email">Email address</Label>
                  <Input
                    id="fp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

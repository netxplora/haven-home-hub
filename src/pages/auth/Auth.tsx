import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const trustIndicators = [
  "Verified Properties",
  "Secure Transactions",
  "Trusted Investors",
  "Protected Ownership Records",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [tab, setTab] = useState(params.get("tab") === "signup" ? "signup" : "signin");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: String(fd.get("name") ?? ""),
          referral_code: String(fd.get("referral_code") ?? "").trim() || null,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created", description: "You're all set — welcome!" });
      navigate("/dashboard");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left Panel — Premium Brand Experience */}
      <div className="relative hidden lg:flex lg:flex-col lg:justify-center lg:items-center lg:p-14 overflow-hidden">
        {/* Animated Background Image */}
        <motion.div
          className="absolute inset-0 z-0 bg-[url('/hero_luxury_penthouse.webp')] bg-cover bg-center"
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
            A home you&apos;ll love coming back to.
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="mt-6 text-lg text-white/80 leading-relaxed font-medium drop-shadow-sm max-w-md"
          >
            Join the platform setting the new standard for modern real estate investment.
          </motion.p>

          <motion.div variants={itemVariants} className="mt-12 w-full grid grid-cols-2 gap-4 text-left">
            {trustIndicators.map((indicator, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-sm font-semibold text-white/90 drop-shadow-sm">{indicator}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <div className="absolute bottom-8 left-0 right-0 text-center z-20">
          <p className="text-xs text-white/40 font-medium">© {new Date().getFullYear()} Haven Home Hub</p>
        </div>
      </div>

      {/* Right Panel — Premium Auth Form */}
      <div className="relative flex flex-col justify-center bg-slate-50 dark:bg-slate-950 px-6 py-14 sm:px-14 min-h-screen">
        {/* Mobile Logo & Hero (Visible only on mobile/tablet) */}
        <div className="lg:hidden relative w-full -mt-14 mb-8 rounded-b-[2rem] overflow-hidden shadow-xl">
          <div className="absolute inset-0 z-0 bg-[url('/hero_luxury_penthouse.webp')] bg-cover bg-center" />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-primary/20" />
          <div className="relative z-20 flex flex-col items-center justify-center pt-20 pb-12 px-6 text-center">
            <Link to="/">
              <img src="/logo.png" alt="Haven Home Hub" className="h-10 w-auto invert drop-shadow-xl mb-6" />
            </Link>
            <h2 className="font-serif text-2xl font-bold leading-tight text-white tracking-tight drop-shadow-md">
              A home you&apos;ll love coming back to.
            </h2>
          </div>
        </div>

        {/* Auth Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto w-full max-w-[440px] rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 shadow-2xl shadow-primary/5 sm:p-10"
        >
          <h1 className="font-serif text-3xl font-bold text-foreground tracking-tight text-center">Welcome</h1>
          <p className="mt-2 text-muted-foreground text-sm font-medium text-center">Sign in or create an account to get started.</p>

          <Tabs value={tab} onValueChange={setTab} className="mt-8">
            <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl bg-secondary/50 p-1">
              <TabsTrigger value="signin" className="rounded-lg text-sm font-semibold transition-all data-[state=active]:shadow-sm">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg text-sm font-semibold transition-all data-[state=active]:shadow-sm">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="focus-visible:outline-none">
              <form onSubmit={signIn} className="space-y-5 pt-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="si-email" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Email</Label>
                  <Input id="si-email" name="email" type="email" required placeholder="you@example.com" className="h-12 rounded-xl focus-visible:ring-primary/50 transition-all bg-background/50" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="si-pwd" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors font-bold">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Input id="si-pwd" name="password" type={showPwd ? "text" : "password"} required minLength={6} placeholder="••••••••" className="h-12 rounded-xl focus-visible:ring-primary/50 pr-12 transition-all bg-background/50" />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  {loading ? "Signing in..." : "Sign in to Dashboard"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="focus-visible:outline-none">
              <form onSubmit={signUp} className="space-y-5 pt-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="su-name" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Full name</Label>
                  <Input id="su-name" name="name" required maxLength={100} placeholder="John Doe" className="h-12 rounded-xl focus-visible:ring-primary/50 transition-all bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Email</Label>
                  <Input id="su-email" name="email" type="email" required placeholder="you@example.com" className="h-12 rounded-xl focus-visible:ring-primary/50 transition-all bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pwd" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Input id="su-pwd" name="password" type={showRegPwd ? "text" : "password"} required minLength={6} placeholder="••••••••" className="h-12 rounded-xl focus-visible:ring-primary/50 pr-12 transition-all bg-background/50" />
                    <button
                      type="button"
                      onClick={() => setShowRegPwd(!showRegPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showRegPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-ref" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Referral code <span className="text-muted-foreground/50 font-medium normal-case">(Optional)</span></Label>
                  <Input id="su-ref" name="referral_code" placeholder="Enter referral code" className="h-12 rounded-xl uppercase focus-visible:ring-primary/50 transition-all bg-background/50" defaultValue={params.get("ref") ?? ""} />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

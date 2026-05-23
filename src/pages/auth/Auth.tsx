import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [tab, setTab] = useState(params.get("tab") === "signup" ? "signup" : "signin");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/dashboard"); }, [user, navigate]);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")), password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    else navigate("/dashboard");
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
          referral_code: String(fd.get("referral_code") ?? "").trim() || null
        },
      },
    });
    setLoading(false);
    if (error) toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Account created", description: "You're all set — welcome!" });
      navigate("/dashboard");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left Panel — Brand */}
      <div className="hidden bg-secondary lg:flex lg:flex-col lg:justify-between lg:p-14">
        <Link to="/" className="flex items-center gap-2.5 font-serif text-lg font-semibold text-white">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </span>
          Haven Home Hub
        </Link>
        <div className="max-w-md">
          <h2 className="font-serif text-3xl font-semibold leading-snug text-white">
            A home you&apos;ll love coming back to.
          </h2>
          <p className="mt-4 text-white/60 leading-relaxed">
            Save your favorite listings, book inspections, and stay in touch with your agent — all from one place.
          </p>
        </div>
        <p className="text-xs text-white/30">© {new Date().getFullYear()} Haven Home Hub</p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex flex-col justify-center bg-background px-6 py-14 sm:px-14">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Mobile Logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2 font-serif text-lg font-semibold text-foreground mb-10">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            Haven Home Hub
          </Link>

          <h1 className="font-serif text-2xl font-semibold text-foreground">Welcome</h1>
          <p className="mt-2 text-muted-foreground text-sm">Sign in or create an account to get started.</p>

          <Tabs value={tab} onValueChange={setTab} className="mt-8">
            <TabsList className="grid w-full grid-cols-2 h-11 rounded-lg">
              <TabsTrigger value="signin" className="rounded-md text-sm font-medium">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-md text-sm font-medium">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-5 pt-8">
                <div className="space-y-2">
                  <Label htmlFor="si-email" className="text-sm font-medium">Email</Label>
                  <Input id="si-email" name="email" type="email" required placeholder="you@example.com" className="h-11 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pwd" className="text-sm font-medium">Password</Label>
                  <Input id="si-pwd" name="password" type="password" required minLength={6} placeholder="••••••••" className="h-11 rounded-lg" />
                </div>
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">Forgot your password?</Link>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-5 pt-8">
                <div className="space-y-2">
                  <Label htmlFor="su-name" className="text-sm font-medium">Full name</Label>
                  <Input id="su-name" name="name" required maxLength={100} placeholder="John Doe" className="h-11 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email" className="text-sm font-medium">Email</Label>
                  <Input id="su-email" name="email" type="email" required placeholder="you@example.com" className="h-11 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pwd" className="text-sm font-medium">Password</Label>
                  <Input id="su-pwd" name="password" type="password" required minLength={6} placeholder="••••••••" className="h-11 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-ref" className="text-sm font-medium">Referral code <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                  <Input id="su-ref" name="referral_code" placeholder="Enter referral code" className="h-11 rounded-lg uppercase" defaultValue={params.get("ref") ?? ""} />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  {loading ? "Creating..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Home } from "lucide-react";
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
        data: { full_name: String(fd.get("name") ?? "") },
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
      <div className="hidden bg-gradient-warm lg:flex lg:flex-col lg:justify-between lg:p-12 lg:text-primary-foreground">
        <Link to="/" className="flex items-center gap-2 font-serif text-xl font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-background/20"><Home className="h-4 w-4" /></span>
          Warm Estate
        </Link>
        <div>
          <h2 className="font-serif text-4xl font-semibold leading-tight">A home you&apos;ll love coming back to.</h2>
          <p className="mt-3 text-primary-foreground/85">Save your favorite listings, book inspections, and stay in touch with your agent.</p>
        </div>
        <p className="text-sm text-primary-foreground/70">© {new Date().getFullYear()} Warm Estate</p>
      </div>

      <div className="flex flex-col justify-center bg-background px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <h1 className="font-serif text-3xl font-semibold">Welcome</h1>
          <p className="mt-1 text-muted-foreground">Sign in or create an account to get started.</p>

          <Tabs value={tab} onValueChange={setTab} className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4 pt-6">
                <div className="space-y-1.5"><Label htmlFor="si-email">Email</Label><Input id="si-email" name="email" type="email" required /></div>
                <div className="space-y-1.5"><Label htmlFor="si-pwd">Password</Label><Input id="si-pwd" name="password" type="password" required minLength={6} /></div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-warm hover:opacity-95">
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4 pt-6">
                <div className="space-y-1.5"><Label htmlFor="su-name">Full name</Label><Input id="su-name" name="name" required maxLength={100} /></div>
                <div className="space-y-1.5"><Label htmlFor="su-email">Email</Label><Input id="su-email" name="email" type="email" required /></div>
                <div className="space-y-1.5"><Label htmlFor="su-pwd">Password</Label><Input id="su-pwd" name="password" type="password" required minLength={6} /></div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-warm hover:opacity-95">
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
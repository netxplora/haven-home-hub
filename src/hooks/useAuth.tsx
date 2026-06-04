import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "agent" | "user";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  profile: any | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isAgent: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer to avoid deadlocks
        setTimeout(() => {
          fetchRoles(sess.user.id);
          fetchProfile(sess.user.id);
        }, 0);
      } else {
        setRoles([]);
        setProfile(null);
      }
    });

    // Then existing session
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        await Promise.all([
          fetchRoles(sess.user.id),
          fetchProfile(sess.user.id)
        ]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchRoles(userId: string) {
    try {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (error) throw error;
      setRoles((data ?? []).map((r) => r.role as AppRole));
    } catch (err) {
      console.error("Error fetching roles:", err);
      setRoles([]);
    }
  }

  async function fetchProfile(userId?: string) {
    const idToFetch = userId || user?.id;
    if (!idToFetch) return;
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", idToFetch).maybeSingle();
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setProfile(null);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const value: AuthContextValue = {
    user, session, roles, profile, loading, refreshProfile: () => fetchProfile(), signOut,
    isAdmin: roles.includes("admin"),
    isAgent: roles.includes("agent"),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

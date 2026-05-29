import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShieldCheck, Clock, UserCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export function ReferralsPanel({ userId }: { userId: string }) {
  const { data: profile } = useQuery({
    queryKey: ["profile-referral", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("referral_code").eq("id", userId).single();
      return data;
    }
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["user-referrals", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("*, profiles:referred_id(full_name, created_at)")
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    }
  });

  const referralCode = profile?.referral_code ?? "Loading...";
  const referralLink = `${window.location.origin}/auth?tab=signup&ref=${referralCode}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  function getStatusStyle(status: string) {
    switch (status) {
      case "registered": return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
      case "invested": return "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400";
      case "bonus_paid": return "bg-primary/10 text-primary";
      default: return "bg-secondary text-secondary-foreground";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "registered": return <Clock className="h-3 w-3" />;
      case "invested": return <UserCheck className="h-3 w-3" />;
      case "bonus_paid": return <ShieldCheck className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  }

  return (
    <div className="space-y-8 ">
      <div>
        <h2 className="text-xl font-serif font-semibold">Refer & Earn</h2>
        <p className="text-sm text-muted-foreground mt-1">Grow your network and earn bonuses on every successful investment.</p>
      </div>

      <div className="rounded-xl bg-primary p-6 sm:p-8 text-primary-foreground overflow-hidden relative">
         <div className="max-w-2xl">
            <h2 className="font-serif text-2xl font-semibold">Share the Wealth</h2>
            <p className="mt-2 text-primary-foreground/80 text-sm leading-relaxed max-w-lg">Invite your network to join. Earn a 5% bonus on their first confirmed investment.</p>
            
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
               <div className="rounded-lg bg-white/10 border border-white/15 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1.5">Referral Code</p>
                  <span className="text-xl font-mono font-semibold tracking-tight select-all">{referralCode}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(referralCode)} className="mt-3 h-8 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium">
                     Copy Code
                  </Button>
               </div>
               <div className="rounded-lg bg-white/10 border border-white/15 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1.5">Referral Link</p>
                  <span className="text-sm font-medium truncate opacity-80 block overflow-hidden">{referralLink}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(referralLink)} className="mt-3 h-8 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium">
                     Copy Link
                  </Button>
               </div>
            </div>
         </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 items-start">
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-1">
               <h3 className="font-serif text-xl font-semibold">Community Network</h3>
                <Badge variant="secondary" className="rounded-md px-3 py-1 font-medium text-xs">{referrals.length} Total</Badge>
            </div>

            <div className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm transition-shadow hover:shadow-md">
               {/* ── Mobile Card Layout ── */}
               <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                 {referrals.length === 0 ? (
                   <div className="p-12 text-center text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No referrals yet. Start sharing!</p>
                   </div>
                 ) : (
                   referrals.map((ref: any) => (
                     <div key={ref.id} className="rounded-xl border border-border/40 bg-card p-4 shadow-sm space-y-4">
                       <div className="flex items-start justify-between gap-3">
                         <div className="flex items-center gap-3">
                           <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                             {(ref.profiles?.full_name || "U")[0]}
                           </div>
                           <div>
                             <p className="font-semibold text-foreground text-sm">{ref.profiles?.full_name || "User"}</p>
                             <p className="text-xs text-muted-foreground mt-0.5">
                               Joined: {new Date(ref.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                             </p>
                           </div>
                         </div>
                         <Badge variant="secondary" className={`capitalize rounded-md flex w-fit items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold shrink-0 ${getStatusStyle(ref.status)}`}>
                           {getStatusIcon(ref.status)}
                           {ref.status ? ref.status.replace("_", " ") : "N/A"}
                         </Badge>
                       </div>
                     </div>
                   ))
                 )}
               </div>

               {/* ── Desktop Table Layout ── */}
               <div className="overflow-x-auto hidden md:block">
                 <div className="w-full overflow-x-auto pb-2">
        <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="bg-accent/50 border-b border-border/40">
                           <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">User</th>
                           <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                           <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">Joined</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-border/40">
                       {referrals.length === 0 ? (
                         <tr>
                           <td colSpan={3} className="px-6 py-20 text-center text-muted-foreground">
                              <div className="flex flex-col items-center gap-3">
                                 <Users className="h-10 w-10 opacity-20" />
                                 <p className="font-medium">No referrals yet. Start sharing!</p>
                              </div>
                           </td>
                         </tr>
                       ) : referrals.map((ref: any) => (
                         <tr key={ref.id} className="transition-colors hover:bg-secondary/10 group">
                            <td className="px-6 py-5">
                               <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary group-hover:scale-110 transition-transform">
                                     {(ref.profiles?.full_name || "U")[0]}
                                  </div>
                                  <p className="font-medium text-foreground">{ref.profiles?.full_name || "User"}</p>
                               </div>
                            </td>
                            <td className="px-6 py-5">
                               <Badge variant="secondary" className={`capitalize rounded-md flex w-fit items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold ${getStatusStyle(ref.status)}`}>
                                  {getStatusIcon(ref.status)}
                                  {ref.status ? ref.status.replace("_", " ") : "N/A"}
                               </Badge>
                            </td>
                            <td className="px-6 py-5 text-right text-xs text-muted-foreground font-medium">
                               {new Date(ref.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                         </tr>
                       ))}
                     </tbody>
                 </table>
      </div>
               </div>
            </div>
         </div>

         <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm space-y-6">
            <h3 className="font-serif text-xl font-semibold px-1">How it works</h3>
            <div className="space-y-6">
               {[
                 { step: 1, title: "Invite Friends", desc: "Share your unique link or code with your network." },
                 { step: 2, title: "They Join", desc: "Your referrals sign up and complete their identity verification." },
                 { step: 3, title: "They Invest", desc: "Once they make their first investment, you earn a bonus." },
                 { step: 4, title: "Earn Rewards", desc: "Bonus is automatically credited to your wallet balance." }
               ].map((item) => (
                 <div key={item.step} className="flex gap-4 group">
                    <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0 group-hover:bg-primary/8 group-hover:text-primary transition-colors">
                       {item.step}
                    </div>
                    <div>
                       <h4 className="font-semibold text-foreground leading-none mb-1.5">{item.title}</h4>
                       <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                 </div>
               ))}
            </div>
            
            <div className="pt-4">
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                 <p className="text-xs font-medium uppercase tracking-wider text-primary mb-1">Current Reward</p>
                 <p className="text-sm font-medium text-foreground">5% commission on first investment</p>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}

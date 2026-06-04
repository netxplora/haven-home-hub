import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, User, Calendar, DollarSign, Award, ArrowUpRight, Settings, Save, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/invest";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/utils";

export function AdminReferrals() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    bonus_percentage: 5,
    min_investment_required: 1000,
    max_bonus_cap: 500
  });

  const { data: config } = useQuery({
    queryKey: ["referral-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_configs")
        .select("value")
        .eq("key", "referral_settings")
        .maybeSingle();
      if (data?.value) setSettings(data.value);
      return data?.value;
    }
  });

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("system_configs")
        .upsert({ 
          key: "referral_settings", 
          value: settings,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      toast({ title: "Settings updated", description: "Referral program configuration has been saved." });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select(`
          *,
          referrer:referrer_id(full_name, email, avatar_url),
          referred:referred_id(full_name, email, avatar_url)
        `)
        .order("created_at", { ascending: false });
      return data ?? [];
    }
  });

  const totalRewards = referrals.reduce((acc: number, curr: any) => acc + (curr.bonus_earned || 0), 0);
  const investedReferrals = referrals.filter((r: any) => r.status === 'invested').length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-serif font-bold">Referral Program</h2>
        <p className="text-sm text-muted-foreground">Monitor user referrals and distributed bonuses.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Stats */}
        <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Referrals</p>
                <p className="text-2xl font-serif font-bold">{referrals.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-500/10 p-3 text-green-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Investors</p>
                <p className="text-2xl font-serif font-bold">{investedReferrals}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Rewards Paid</p>
                <p className="text-2xl font-serif font-bold">{formatMoney(totalRewards)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Card */}
        <Card className="rounded-xl border-primary/20 shadow-card overflow-hidden">
          <CardHeader className="bg-accent/50 pb-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Program Settings</CardTitle>
            </div>
            <CardDescription className="text-[10px]">Configure bonus rules and caps.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Bonus Percentage (%)</Label>
              <Input 
                type="number" 
                value={settings.bonus_percentage} 
                onChange={e => setSettings({...settings, bonus_percentage: Number(e.target.value)})}
                className="h-9 text-sm font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Min. Investment Required ($)</Label>
              <Input 
                type="number" 
                value={settings.min_investment_required} 
                onChange={e => setSettings({...settings, min_investment_required: Number(e.target.value)})}
                className="h-9 text-sm font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Max Bonus Cap ($)</Label>
              <Input 
                type="number" 
                value={settings.max_bonus_cap} 
                onChange={e => setSettings({...settings, max_bonus_cap: Number(e.target.value)})}
                className="h-9 text-sm font-bold"
              />
            </div>
            <Button 
              onClick={handleSaveSettings} 
              disabled={isSaving}
              className="w-full mt-2 h-10 font-bold"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Card View (md:hidden) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {referrals.length === 0 && !isLoading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No referral data found.</p>
          </div>
        ) : (
          referrals.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-xs text-muted-foreground block text-[10px] uppercase font-medium">Referral Details</span>
                <Badge variant={r.status === 'invested' ? 'default' : 'secondary'} className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md ${r.status === 'registered' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : ''}`}>
                  {r.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium block">Referrer</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-7 w-7 shrink-0 rounded-full border border-border/50">
                      <AvatarImage src={getAvatarUrl(r.referrer?.avatar_url)} />
                      <AvatarFallback className="bg-secondary text-[10px] font-bold">
                        {r.referrer?.full_name?.charAt(0) ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-foreground truncate">{r.referrer?.full_name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{r.referrer?.email}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium block">Referred</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-7 w-7 shrink-0 rounded-full border border-border/50">
                      <AvatarImage src={getAvatarUrl(r.referred?.avatar_url)} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                        {r.referred?.full_name?.charAt(0) ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-foreground truncate">{r.referred?.full_name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{r.referred?.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Joined Date</span>
                  <span className="text-foreground block mt-0.5">{new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Bonus Earned</span>
                  <span className="font-bold text-primary block mt-0.5">{formatMoney(r.bonus_earned)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (hidden md:block) */}
      <div className="hidden md:block rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="w-full overflow-x-auto pb-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/20 border-b border-border/50">
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">Referrer</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">Referred User</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">Date Joined</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right whitespace-nowrap">Bonus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {referrals.map((r: any) => (
                  <tr key={r.id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0 rounded-full border border-border/50">
                          <AvatarImage src={getAvatarUrl(r.referrer?.avatar_url)} />
                          <AvatarFallback className="bg-secondary text-[10px] font-bold">
                            {r.referrer?.full_name?.charAt(0) ?? "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-foreground">{r.referrer?.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{r.referrer?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0 rounded-full border border-border/50">
                          <AvatarImage src={getAvatarUrl(r.referred?.avatar_url)} />
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                            {r.referred?.full_name?.charAt(0) ?? "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-foreground">{r.referred?.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{r.referred?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={r.status === 'invested' ? 'default' : 'secondary'} className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md ${r.status === 'registered' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : ''}`}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-muted-foreground font-medium">
                      {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-primary">
                      {formatMoney(r.bonus_earned)}
                    </td>
                  </tr>
                ))}
                {referrals.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground italic bg-secondary/5">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No referral data found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

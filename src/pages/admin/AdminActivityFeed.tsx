import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Megaphone, Activity, BarChart3, Settings2, Copy, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/* ──────────────────────────────────────────────
   Activity Template Library
   Covers every major platform activity category.
   Admin can click "Use" to load the text into the
   create dialog, then modify before publishing.
   ────────────────────────────────────────────── */
const ACTIVITY_TEMPLATES: { category: string; type: string; templates: string[] }[] = [
  {
    category: "Fractional Investments",
    type: "fractional",
    templates: [
      "A new investor just secured units in Sunset Ridge Residences.",
      "3 units were allocated in Palm Grove Estate moments ago.",
      "An investor from Lagos just joined the Oceanview Residences portfolio.",
      "A fractional ownership stake was confirmed for Lakeview Towers.",
      "New investment confirmed — units allocated in Marina Bay Apartments.",
    ],
  },
  {
    category: "Property Purchases",
    type: "purchase",
    templates: [
      "A property in Miami was just purchased.",
      "A buyer completed a full acquisition in Lekki Phase 1.",
      "A 4-bedroom villa was sold in Abuja today.",
      "A commercial unit purchase was finalized in Victoria Island.",
      "A new homeowner just closed on a property in Ikoyi.",
    ],
  },
  {
    category: "Reservations",
    type: "reservation",
    templates: [
      "A property in Banana Island was just reserved.",
      "A client reserved a penthouse unit in Downtown Towers.",
      "A reservation deposit was received for Parkview Estate.",
      "A new reservation was placed for a 3-bedroom unit.",
      "Someone just reserved a spot in the upcoming Greenfield development.",
    ],
  },
  {
    category: "Rental Transactions",
    type: "rent",
    templates: [
      "A tenant signed a 12-month lease for a 2-bedroom in Lekki.",
      "A rental agreement was finalized for a luxury apartment.",
      "A short-term rental was booked in Victoria Island.",
      "A new tenant moved into Marina Residences this week.",
      "A corporate lease was signed for office space in Ikeja.",
    ],
  },
  {
    category: "New Listings",
    type: "listing",
    templates: [
      "A new luxury property was just listed in Miami.",
      "A premium 5-bedroom estate is now available for investment.",
      "A commercial property in Lagos was just added to the marketplace.",
      "A new waterfront development is now open for fractional investment.",
      "A newly completed residential tower is available for purchase.",
    ],
  },
  {
    category: "Funding Milestones",
    type: "milestone",
    templates: [
      "Oceanview Residences has reached 75% funding.",
      "Palm Heights is now fully funded — all units allocated.",
      "Sunset Ridge Residences crossed the $1M funding mark.",
      "Lakeview Towers has attracted 50 investors this month.",
      "The Marina Bay project is 90% funded — limited units remain.",
    ],
  },
  {
    category: "KYC & Verification",
    type: "marketing",
    templates: [
      "Over 200 verified investors are now on the platform.",
      "Our investor verification process ensures secure transactions.",
      "All investors are identity-verified before purchasing units.",
      "Investor onboarding increased by 30% this quarter.",
    ],
  },
  {
    category: "Platform Announcements",
    type: "marketing",
    templates: [
      "New payment methods are now available for investors.",
      "Our referral program is live — earn rewards for every referral.",
      "Installment payment plans are now available on select properties.",
      "Holiday hours: Customer support is available 24/7 this weekend.",
      "We have expanded to 3 new cities this month.",
      "Limited-time opportunity — reduced minimum investment on select assets.",
    ],
  },
];

export function AdminActivityFeed() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newToast, setNewToast] = useState({ type: "marketing", message: "" });
  const [saving, setSaving] = useState(false);

  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ["admin-toast-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("system_configs").select("*").eq("key", "activity_toasts").single();
      if (error) throw error;
      return data;
    }
  });

  const { data: toasts = [], isLoading: loadingToasts } = useQuery({
    queryKey: ["admin-activity-toasts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("activity_toasts").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    }
  });

  const handleUpdateConfig = async (updates: any) => {
    try {
      const newValue = { ...config.value, ...updates };
      const { error } = await (supabase as any).from("system_configs").update({ value: newValue }).eq("id", config.id);
      if (error) throw error;
      toast({ title: "Settings updated" });
      qc.invalidateQueries({ queryKey: ["admin-toast-settings"] });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateToast = async () => {
    if (!newToast.message.trim()) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("activity_toasts").insert([
        { type: newToast.type, message: newToast.message, is_active: true }
      ]);
      if (error) throw error;
      toast({ title: "Toast created" });
      setOpen(false);
      setNewToast({ type: "marketing", message: "" });
      qc.invalidateQueries({ queryKey: ["admin-activity-toasts"] });
    } catch (err: any) {
      toast({ title: "Failed to create", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleToastStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase as any).from("activity_toasts").update({ is_active: !currentStatus }).eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-activity-toasts"] });
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    }
  };

  const deleteToast = async (id: string) => {
    if (!confirm("Delete this toast forever?")) return;
    try {
      const { error } = await (supabase as any).from("activity_toasts").delete().eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-activity-toasts"] });
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  const useTemplate = (type: string, message: string) => {
    setNewToast({ type, message });
    setOpen(true);
  };

  if (loadingConfig || loadingToasts) return <div className="p-12 animate-pulse text-center">Loading feed settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Activity Feed Management</h2>
          <p className="text-muted-foreground text-sm mt-1">Control the real-time social proof toasts shown to visitors.</p>
        </div>
        <Button onClick={() => { setNewToast({ type: "marketing", message: "" }); setOpen(true); }} className="rounded-xl font-bold">
          <Plus className="mr-2 h-4 w-4" /> Create Custom Toast
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="col-span-1 space-y-6">
          <div className="bg-card rounded-xl border border-border/50 p-6 shadow-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Settings2 className="h-4 w-4 text-primary" /> Global Settings
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Toasts</Label>
                  <p className="text-[10px] text-muted-foreground">Show toasts on frontend</p>
                </div>
                <Switch 
                  checked={config?.value?.enabled} 
                  onCheckedChange={(v) => handleUpdateConfig({ enabled: v })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Display Interval (Seconds)</Label>
                <div className="flex gap-2">
                  {[10, 15, 20, 30].map(val => (
                    <Button 
                      key={val}
                      size="sm" 
                      variant={config?.value?.interval_seconds === val ? "default" : "outline"}
                      onClick={() => handleUpdateConfig({ interval_seconds: val })}
                      className="flex-1 text-xs"
                    >
                      {val}s
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>History Limit</Label>
                <div className="flex gap-2">
                  {[20, 50, 100].map(val => (
                    <Button 
                      key={val}
                      size="sm" 
                      variant={config?.value?.display_count === val ? "default" : "outline"}
                      onClick={() => handleUpdateConfig({ display_count: val })}
                      className="flex-1 text-xs"
                    >
                      Last {val}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Toast Duration (Seconds)</Label>
                <div className="flex gap-2">
                  {[3, 5, 8, 10].map(val => (
                    <Button 
                      key={val}
                      size="sm" 
                      variant={(config?.value?.display_duration_seconds || 5) === val ? "default" : "outline"}
                      onClick={() => handleUpdateConfig({ display_duration_seconds: val })}
                      className="flex-1 text-xs"
                    >
                      {val}s
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Display Pages</Label>
                <Select 
                  value={config?.value?.display_pages || "all"} 
                  onValueChange={(val) => handleUpdateConfig({ display_pages: val })}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Select pages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pages</SelectItem>
                    <SelectItem value="home">Homepage Only</SelectItem>
                    <SelectItem value="invest">Investments Map Only</SelectItem>
                    <SelectItem value="properties">Properties Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border/50 p-6 shadow-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" /> Analytics Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Events</span>
                <span className="font-mono font-semibold">{toasts.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Active</span>
                <span className="font-mono font-semibold">{toasts.filter((t: any) => t.is_active).length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Marketing</span>
                <span className="font-mono font-semibold">{toasts.filter((t: any) => t.type === 'marketing' && t.is_active).length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feed List */}
        <div className="col-span-1 md:col-span-2">
          <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden h-[600px] flex flex-col">
            <div className="p-4 border-b border-border/50 bg-muted/30 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Recent Activity Log</h3>
              <span className="text-[10px] text-muted-foreground ml-auto">{toasts.length} entries</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {toasts.map((toastItem: any) => (
                <div key={toastItem.id} className={`flex items-start justify-between gap-4 p-4 rounded-lg border ${toastItem.is_active ? 'bg-background border-border/50' : 'bg-muted/30 border-border/20 opacity-60'}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] uppercase bg-primary/5">{toastItem.type}</Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(toastItem.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{toastItem.message}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch 
                      checked={toastItem.is_active} 
                      onCheckedChange={() => toggleToastStatus(toastItem.id, toastItem.is_active)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => deleteToast(toastItem.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {toasts.length === 0 && (
                <div className="text-center p-8 text-muted-foreground text-sm">No activity recorded yet. Use a template below to get started.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Template Library ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Activity Templates</h3>
          <span className="text-xs text-muted-foreground ml-1">Click "Use" to load into the editor, then modify before publishing.</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ACTIVITY_TEMPLATES.map((group) => (
            <div key={group.category} className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border/50 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.category}</h4>
                <Badge variant="outline" className="text-[9px] uppercase">{group.type}</Badge>
              </div>
              <div className="p-3 space-y-2">
                {group.templates.map((tpl, idx) => (
                  <div key={idx} className="flex items-start gap-2 group">
                    <p className="text-xs text-foreground leading-relaxed flex-1 py-1">{tpl}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-primary hover:bg-primary/10"
                      onClick={() => useTemplate(group.type, tpl)}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Use
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Create Activity Toast</DialogTitle>
            <DialogDescription>Publish a toast to the live activity feed. You can modify the text before publishing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Toast Type</Label>
              <RadioGroup value={newToast.type} onValueChange={(v) => setNewToast({ ...newToast, type: v })} className="flex flex-wrap gap-x-4 gap-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="marketing" id="r1" />
                  <Label htmlFor="r1">Marketing</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="milestone" id="r2" />
                  <Label htmlFor="r2">Milestone</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="listing" id="r3" />
                  <Label htmlFor="r3">New Listing</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fractional" id="r4" />
                  <Label htmlFor="r4">Investment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="purchase" id="r5" />
                  <Label htmlFor="r5">Purchase</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reservation" id="r6" />
                  <Label htmlFor="r6">Reservation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rent" id="r7" />
                  <Label htmlFor="r7">Rental</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea 
                value={newToast.message} 
                onChange={(e) => setNewToast({ ...newToast, message: e.target.value })}
                placeholder="e.g., A new premium estate was just added in Miami!"
                className="resize-none h-24"
              />
              <p className="text-[10px] text-muted-foreground">Keep it short and professional. This text appears exactly as written on the live site.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateToast} disabled={saving || !newToast.message.trim()}>
              <Megaphone className="mr-2 h-4 w-4" /> Publish Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

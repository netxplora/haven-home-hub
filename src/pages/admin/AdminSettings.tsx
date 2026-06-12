import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Save, RefreshCw, AlertCircle, Play, Clock, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AdminSettings() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [runningMaintenance, setRunningMaintenance] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState<any>(null);

  async function runMaintenance() {
    setRunningMaintenance(true);
    setMaintenanceResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("run-maintenance");
      if (error) throw error;
      setMaintenanceResult(data);
      toast({ title: "Maintenance Complete", description: `Expired ${data?.expired_reservations ?? 0} reservations, found ${data?.overdue_installments ?? 0} overdue installments.` });
      qc.invalidateQueries({ queryKey: ["admin-overview-counts"] });
    } catch (error: any) {
      toast({ title: "Maintenance Failed", description: error.message, variant: "destructive" });
    } finally {
      setRunningMaintenance(false);
    }
  }

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["admin-system-configs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("system_configs")
        .select("*")
        .order("category", { ascending: true })
        .order("key", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  async function updateConfig(id: string, key: string, value: string) {
    setSaving(id);
    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        // If not valid JSON, treat as string if it's simple or error
        parsedValue = value;
      }

      const { error } = await (supabase as any)
        .from("system_configs")
        .update({ value: parsedValue, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Configuration Updated", description: `Successfully updated ${key}` });
      qc.invalidateQueries({ queryKey: ["admin-system-configs"] });
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  if (isLoading) return <Skeleton className="h-[600px] w-full rounded-xl" />;

  const categories = Array.from(new Set((configs as any[]).map((c) => c.category))).sort();
  const [activeTab, setActiveTab] = useState<string>("platform");

  // Sync activeTab if categories change and it's not present
  if (categories.length > 0 && activeTab !== "maintenance" && !categories.includes(activeTab)) {
    setActiveTab(categories[0] as string);
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Registry</h2>
          <p className="text-muted-foreground mt-1">Manage core platform configurations and recovery engines.</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl border-border/50 shadow-sm" onClick={() => qc.invalidateQueries({ queryKey: ["admin-system-configs"] })}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        {/* Sidebar */}
        <aside className="sticky top-20 flex flex-col gap-1.5 p-4 rounded-2xl border border-border/50 bg-card shadow-soft">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-3">System Modules</div>
          <button
            onClick={() => setActiveTab("maintenance")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "maintenance" 
                ? "bg-primary text-primary-foreground shadow-md scale-[1.02]" 
                : "text-foreground/70 hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            <AlertCircle className="h-4 w-4" /> Operations
          </button>
          
          <div className="my-2 border-t border-border/50" />
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-3">Configurations</div>
          
          {categories.map((cat: any) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all capitalize ${
                activeTab === cat 
                  ? "bg-primary text-primary-foreground shadow-md scale-[1.02]" 
                  : "text-foreground/70 hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
              {cat}
            </button>
          ))}
        </aside>

        {/* Main Content Area */}
        <main className="space-y-6">
          {activeTab === "maintenance" ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <Alert variant="default" className="bg-primary/5 border-primary/20 rounded-xl">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary font-semibold">Self-Healing Infrastructure</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Changes to these parameters affect real-time calculations and system triggers. All changes are audit-logged.
                </AlertDescription>
              </Alert>

              <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">Platform Maintenance</h3>
                    <p className="text-sm text-muted-foreground mt-1">Expire stale reservations and flag overdue installments.</p>
                  </div>
                  <Button
                    onClick={runMaintenance}
                    disabled={runningMaintenance}
                    className="rounded-xl px-6 h-11 font-bold shadow-sm"
                  >
                    {runningMaintenance ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Run Maintenance
                  </Button>
                </div>
                {maintenanceResult && (
                  <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-secondary/20 border border-secondary/30 mt-4">
                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 font-bold bg-background">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" /> {maintenanceResult.expired_reservations} Expired
                    </Badge>
                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 font-bold bg-background">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {maintenanceResult.overdue_installments} Overdue
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto font-mono font-medium">
                      Last run: {new Date(maintenanceResult.timestamp).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="pb-4 border-b border-border/40">
                <h3 className="text-2xl font-bold capitalize">{activeTab} Variables</h3>
                <p className="text-sm text-muted-foreground mt-1">Configure global parameters for the {activeTab} module.</p>
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                {configs
                  .filter((c: any) => c.category === activeTab)
                  .map((config: any) => (
                    <ConfigCard 
                      key={config.id} 
                      config={config} 
                      isSaving={saving === config.id} 
                      onSave={(val) => updateConfig(config.id, config.key, val)} 
                    />
                  ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ConfigCard({ config, onSave, isSaving }: { config: any; onSave: (val: string) => void; isSaving: boolean }) {
  const [parsedVal, setParsedVal] = useState<any>(config.value);

  const type = typeof parsedVal;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-6 transition-all hover:shadow-lg hover:shadow-primary/5">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {config.key.replace(/_/g, " ")}
            </Label>
            <p className="text-xs text-muted-foreground/80">{config.description}</p>
          </div>
          <Button 
            size="sm" 
            className="rounded-xl px-4 h-9 font-semibold" 
            disabled={isSaving || JSON.stringify(parsedVal) === JSON.stringify(config.value)}
            onClick={() => onSave(JSON.stringify(parsedVal))}
          >
            {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
        
        <div className="pt-2">
          {type === "boolean" ? (
             <div className="flex items-center space-x-3 bg-background/50 p-3 rounded-xl border border-border/50">
               <Switch 
                 checked={parsedVal} 
                 onCheckedChange={(v) => setParsedVal(v)} 
                 className="data-[state=checked]:bg-primary"
               />
               <span className="text-sm font-semibold">{parsedVal ? "Enabled" : "Disabled"}</span>
             </div>
          ) : type === "number" ? (
             <Input 
               type="number" 
               value={parsedVal} 
               onChange={(e) => setParsedVal(Number(e.target.value))} 
               className="font-mono font-medium bg-background/50 h-11 rounded-xl border-border/50"
             />
          ) : type === "string" ? (
             parsedVal.length > 60 ? (
               <textarea
                 value={parsedVal}
                 onChange={(e) => setParsedVal(e.target.value)}
                 className="min-h-[100px] w-full rounded-xl border border-border/50 bg-background/50 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y"
                 spellCheck={false}
               />
             ) : (
               <Input 
                 type="text" 
                 value={parsedVal} 
                 onChange={(e) => setParsedVal(e.target.value)} 
                 className="font-mono font-medium bg-background/50 h-11 rounded-xl border-border/50 text-sm"
               />
             )
          ) : (
             <textarea
               value={typeof parsedVal === 'string' ? parsedVal : JSON.stringify(parsedVal, null, 2)}
               onChange={(e) => {
                 try {
                   setParsedVal(JSON.parse(e.target.value));
                 } catch {
                   setParsedVal(e.target.value); // Fallback to string while typing
                 }
               }}
               className="min-h-[140px] w-full rounded-xl border border-border/50 bg-background/50 p-4 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
               spellCheck={false}
             />
          )}
        </div>
      </div>
    </div>
  );
}

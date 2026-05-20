import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

  const categories = Array.from(new Set((configs as any[]).map((c) => c.category)));

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Registry</h2>
          <p className="text-muted-foreground mt-1">Manage core platform configurations and recovery engines.</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl border-border/50" onClick={() => qc.invalidateQueries({ queryKey: ["admin-system-configs"] })}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Alert variant="default" className="bg-primary/5 border-primary/20 rounded-xl">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-semibold">Self-Healing Infrastructure</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Changes to these parameters affect real-time calculations and system triggers. All changes are audit-logged.
        </AlertDescription>
      </Alert>

      {/* Maintenance Section */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Platform Maintenance</h3>
            <p className="text-sm text-muted-foreground mt-1">Expire stale reservations and flag overdue installments.</p>
          </div>
          <Button
            onClick={runMaintenance}
            disabled={runningMaintenance}
            className="rounded-xl px-6 h-10 font-bold"
          >
            {runningMaintenance ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Run Now
          </Button>
        </div>
        {maintenanceResult && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/10 border border-secondary/20">
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 font-bold">
              <Trash2 className="h-3 w-3" /> {maintenanceResult.expired_reservations} Expired
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 font-bold">
              <Clock className="h-3 w-3" /> {maintenanceResult.overdue_installments} Overdue
            </Badge>
            <span className="text-[10px] text-muted-foreground ml-auto font-mono">
              {new Date(maintenanceResult.timestamp).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {categories.map((category) => (
        <div key={category} className="space-y-4">
          <h3 className="text-xl font-semibold capitalize px-1">{category} Configuration</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {configs
              .filter((c) => c.category === category)
              .map((config) => (
                <ConfigCard 
                  key={config.id} 
                  config={config} 
                  isSaving={saving === config.id} 
                  onSave={(val) => updateConfig(config.id, config.key, val)} 
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfigCard({ config, onSave, isSaving }: { config: any; onSave: (val: string) => void; isSaving: boolean }) {
  const [val, setVal] = useState(JSON.stringify(config.value, null, 2));

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-6 transition-all hover:shadow-lg hover:shadow-primary/5">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{config.key}</Label>
            <p className="text-xs text-muted-foreground/80">{config.description}</p>
          </div>
          <Button 
            size="sm" 
            className="rounded-xl px-4 h-9" 
            disabled={isSaving || val === JSON.stringify(config.value, null, 2)}
            onClick={() => onSave(val)}
          >
            {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
        
        <div className="relative">
          <textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="min-h-[120px] w-full rounded-xl border border-border/50 bg-background/50 p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useBrand } from "@/hooks/useBrand";
import { BrandService, BrandDefaults } from "@/lib/brandService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { CmsMediaUploader } from "@/components/admin/CmsMediaUploader";
import { RefreshCw, Save, Undo2, CheckCircle2, Plus, X } from "lucide-react";

// Helper component for color inputs
function ColorPickerInput({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center justify-between">
        <span>{label}</span>
        <span className="font-mono lowercase text-[10px]">{value}</span>
      </Label>
      <div className="flex gap-3">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-16 p-1 rounded-lg cursor-pointer"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 rounded-xl flex-1 font-mono uppercase text-sm"
          pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
        />
      </div>
    </div>
  );
}

export function AdminBrandSettings() {
  const { brand, refresh } = useBrand();
  const [f, setF] = useState(brand);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(
    brand.updated_at ? new Date(brand.updated_at) : null
  );

  // Sync state if brand context updates from elsewhere
  useEffect(() => {
    setF(brand);
    if (brand.updated_at) {
      setLastSaved(new Date(brand.updated_at));
    }
  }, [brand]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await BrandService.updateBrand(f);
      await refresh();
      setLastSaved(new Date());
      toast({ title: "Brand settings updated successfully" });
    } catch (error: any) {
      toast({
        title: "Failed to update brand settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (confirm("Reset to default seed values? This will wipe your current customizations.")) {
      setF(BrandDefaults);
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-semibold">Brand Settings</h2>
          <p className="text-sm text-muted-foreground">
            Manage the platform's visual identity, contact details, and global branding.
          </p>
        </div>
        {lastSaved && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/20 px-3 py-1.5 rounded-full border border-border/40">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            Last updated: {lastSaved.toLocaleString()}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
        {/* Identity Section */}
        <div className="space-y-6 rounded-xl border border-border p-6 bg-card shadow-sm">
          <div className="border-b border-border pb-3 mb-4">
            <h3 className="font-semibold font-serif text-lg">Identity</h3>
            <p className="text-xs text-muted-foreground">The core naming and slogan of your platform.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Platform Name</Label>
              <Input
                required
                value={f.platform_name}
                onChange={(e) => setF({ ...f, platform_name: e.target.value })}
                className="h-10 rounded-xl"
                placeholder="e.g. Acme Corporation"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Tagline</Label>
              <Input
                value={f.tagline || ""}
                onChange={(e) => setF({ ...f, tagline: e.target.value })}
                className="h-10 rounded-xl"
                placeholder="e.g. Smart Property Investment"
              />
            </div>
          </div>
        </div>

        {/* Visual Identity Section */}
        <div className="space-y-6 rounded-xl border border-border p-6 bg-card shadow-sm">
          <div className="border-b border-border pb-3 mb-4">
            <h3 className="font-semibold font-serif text-lg">Visual Identity</h3>
            <p className="text-xs text-muted-foreground">Logos and brand colors applied globally.</p>
          </div>
          
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-4">
              <CmsMediaUploader
                value={f.logo_url || ""}
                onChange={(url) => setF({ ...f, logo_url: url })}
                folder="brand"
                label="Primary Logo"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Recommended: Clear PNG with transparent background. If left blank, /logo.png is used.</p>
            </div>
            <div className="space-y-4">
              <CmsMediaUploader
                value={f.favicon_url || ""}
                onChange={(url) => setF({ ...f, favicon_url: url })}
                folder="brand"
                label="Favicon"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Recommended: Square format (e.g. 512x512). If left blank, default favicon is used.</p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 pt-4">
            <ColorPickerInput 
              label="Primary Color" 
              value={f.primary_color} 
              onChange={(val) => setF({ ...f, primary_color: val })} 
            />
            <ColorPickerInput 
              label="Secondary Color" 
              value={f.secondary_color} 
              onChange={(val) => setF({ ...f, secondary_color: val })} 
            />
          </div>
        </div>

        {/* Advanced Color System */}
        <div className="space-y-6 rounded-xl border border-border p-6 bg-card shadow-sm">
          <div className="border-b border-border pb-3 mb-4">
            <h3 className="font-semibold font-serif text-lg">Advanced Color System</h3>
            <p className="text-xs text-muted-foreground">Fine-grained control over UI element colors across the platform.</p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            <ColorPickerInput label="Accent Color" value={f.accent_color || ""} onChange={(val) => setF({ ...f, accent_color: val })} />
            <ColorPickerInput label="Background Color" value={f.background_color || ""} onChange={(val) => setF({ ...f, background_color: val })} />
            <ColorPickerInput label="Card Color" value={f.card_color || ""} onChange={(val) => setF({ ...f, card_color: val })} />
            <ColorPickerInput label="Navigation Color" value={f.navigation_color || ""} onChange={(val) => setF({ ...f, navigation_color: val })} />
            <ColorPickerInput label="Dashboard Color" value={f.dashboard_color || ""} onChange={(val) => setF({ ...f, dashboard_color: val })} />
            <ColorPickerInput label="Loading Color" value={f.loading_color || ""} onChange={(val) => setF({ ...f, loading_color: val })} />
            <ColorPickerInput label="Skeleton Color" value={f.skeleton_color || ""} onChange={(val) => setF({ ...f, skeleton_color: val })} />
            <ColorPickerInput label="Notification Color" value={f.notification_color || ""} onChange={(val) => setF({ ...f, notification_color: val })} />
            <ColorPickerInput label="Progress Bar Color" value={f.progress_bar_color || ""} onChange={(val) => setF({ ...f, progress_bar_color: val })} />
            <ColorPickerInput label="Document Accent" value={f.document_accent_color || ""} onChange={(val) => setF({ ...f, document_accent_color: val })} />
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Button Style</Label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm"
                value={f.button_style || "rounded-md"}
                onChange={(e) => setF({ ...f, button_style: e.target.value })}
              >
                <option value="rounded-none">Square (Sharp)</option>
                <option value="rounded-md">Slightly Rounded</option>
                <option value="rounded-xl">Very Rounded</option>
                <option value="rounded-full">Pill (Fully Rounded)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 block mb-3">Chart Color Palette</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {(f.chart_palette || []).map((color, index) => (
                <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md border border-border">
                  <div className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: color }}></div>
                  <span className="font-mono text-[10px] uppercase">{color}</span>
                  <button 
                    type="button"
                    onClick={() => {
                      const newPalette = [...(f.chart_palette || [])];
                      newPalette.splice(index, 1);
                      setF({ ...f, chart_palette: newPalette });
                    }}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                id="new-chart-color"
                type="color"
                defaultValue="#10B981"
                className="h-10 w-16 p-1 rounded-lg cursor-pointer"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="h-10"
                onClick={() => {
                  const input = document.getElementById("new-chart-color") as HTMLInputElement;
                  if (input && input.value) {
                    setF({ ...f, chart_palette: [...(f.chart_palette || []), input.value] });
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Color to Palette
              </Button>
            </div>
          </div>
        </div>

        {/* Contact & Legal Section */}
        <div className="space-y-6 rounded-xl border border-border p-6 bg-card shadow-sm">
          <div className="border-b border-border pb-3 mb-4">
            <h3 className="font-semibold font-serif text-lg">Contact & Legal</h3>
            <p className="text-xs text-muted-foreground">Used in footers, terms, and formal documentation.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Support Email</Label>
              <Input
                type="email"
                required
                value={f.support_email}
                onChange={(e) => setF({ ...f, support_email: e.target.value })}
                className="h-10 rounded-xl"
                placeholder="support@domain.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Legal Name</Label>
              <Input
                required
                value={f.legal_name}
                onChange={(e) => setF({ ...f, legal_name: e.target.value })}
                className="h-10 rounded-xl"
                placeholder="e.g. Acme Corporation LLC"
              />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-4">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={handleReset}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Undo2 className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          
          <Button 
            type="submit" 
            disabled={saving} 
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-12 rounded-xl font-bold shadow-sm"
          >
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Brand Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

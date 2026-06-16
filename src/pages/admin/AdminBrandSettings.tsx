import { useState, useEffect } from "react";
import { useBrand } from "@/hooks/useBrand";
import { BrandService, BrandDefaults } from "@/lib/brandService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { CmsMediaUploader } from "@/components/admin/CmsMediaUploader";
import { RefreshCw, Save, Undo2, CheckCircle2 } from "lucide-react";

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
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center justify-between">
                <span>Primary Color</span>
                <span className="font-mono lowercase text-[10px]">{f.primary_color}</span>
              </Label>
              <div className="flex gap-3">
                <Input
                  type="color"
                  value={f.primary_color}
                  onChange={(e) => setF({ ...f, primary_color: e.target.value })}
                  className="h-10 w-16 p-1 rounded-lg cursor-pointer"
                />
                <Input
                  type="text"
                  value={f.primary_color}
                  onChange={(e) => setF({ ...f, primary_color: e.target.value })}
                  className="h-10 rounded-xl flex-1 font-mono uppercase text-sm"
                  pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center justify-between">
                <span>Secondary Color</span>
                <span className="font-mono lowercase text-[10px]">{f.secondary_color}</span>
              </Label>
              <div className="flex gap-3">
                <Input
                  type="color"
                  value={f.secondary_color}
                  onChange={(e) => setF({ ...f, secondary_color: e.target.value })}
                  className="h-10 w-16 p-1 rounded-lg cursor-pointer"
                />
                <Input
                  type="text"
                  value={f.secondary_color}
                  onChange={(e) => setF({ ...f, secondary_color: e.target.value })}
                  className="h-10 rounded-xl flex-1 font-mono uppercase text-sm"
                  pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                />
              </div>
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

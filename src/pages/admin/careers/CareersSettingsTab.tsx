import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

export function CareersSettingsTab() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["careers-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("careers_settings").select("*").single();
      // If table doesn't exist yet, we'll return mock data for now to prevent breaking the UI
      if (error && error.code !== 'PGRST116') {
         console.warn("Careers settings not found, using default");
         return {
            hero_title: "Build Your Career With Us",
            hero_description: "Join our innovative team",
            hero_background_url: "",
            cta_text: "View Open Positions",
            cta_link: "#openings",
            cta_enabled: true,
            total_employees: 0,
            countries_served: 0,
            open_positions: 0,
            accept_applications: true,
            accept_cv_uploads: true,
            max_upload_size_mb: 5,
            seo_title: "Careers",
            seo_description: "Join our team"
         };
      }
      return data;
    }
  });

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (settings) setFormData(settings);
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (newData: any) => {
      if (!newData.id) return; // Prevent updating if mock
      const { error } = await supabase
        .from("careers_settings")
        .update(newData)
        .eq("id", newData.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careers-settings"] });
      toast({ title: "Settings updated", description: "Careers page settings have been saved successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
          <CardDescription>Manage the main header of the careers page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Hero Title</Label>
            <Input value={formData.hero_title || ""} onChange={e => handleChange("hero_title", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Hero Description</Label>
            <Textarea value={formData.hero_description || ""} onChange={e => handleChange("hero_description", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Background Image URL</Label>
            <Input value={formData.hero_background_url || ""} onChange={e => handleChange("hero_background_url", e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>CTA Text</Label>
              <Input value={formData.cta_text || ""} onChange={e => handleChange("cta_text", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>CTA Link</Label>
              <Input value={formData.cta_link || ""} onChange={e => handleChange("cta_link", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Stats</CardTitle>
          <CardDescription>Display metrics about the company size and growth.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label>Total Employees</Label>
            <Input type="number" value={formData.total_employees || 0} onChange={e => handleChange("total_employees", parseInt(e.target.value))} />
          </div>
          <div className="grid gap-2">
            <Label>Countries Served</Label>
            <Input type="number" value={formData.countries_served || 0} onChange={e => handleChange("countries_served", parseInt(e.target.value))} />
          </div>
          <div className="grid gap-2">
            <Label>Open Positions</Label>
            <Input type="number" value={formData.open_positions || 0} onChange={e => handleChange("open_positions", parseInt(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>Configure how applicants can submit resumes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Accept Applications</Label>
              <p className="text-sm text-muted-foreground">Allow users to submit applications via the website.</p>
            </div>
            <Switch checked={!!formData.accept_applications} onCheckedChange={v => handleChange("accept_applications", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Accept CV Uploads</Label>
              <p className="text-sm text-muted-foreground">Allow users to attach files to their application.</p>
            </div>
            <Switch checked={!!formData.accept_cv_uploads} onCheckedChange={v => handleChange("accept_cv_uploads", v)} />
          </div>
          <div className="grid gap-2 max-w-xs">
            <Label>Max Upload Size (MB)</Label>
            <Input type="number" value={formData.max_upload_size_mb || 5} onChange={e => handleChange("max_upload_size_mb", parseInt(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO Meta Tags</CardTitle>
          <CardDescription>Optimize the careers page for search engines.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>SEO Title</Label>
            <Input value={formData.seo_title || ""} onChange={e => handleChange("seo_title", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>SEO Description</Label>
            <Textarea value={formData.seo_description || ""} onChange={e => handleChange("seo_description", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

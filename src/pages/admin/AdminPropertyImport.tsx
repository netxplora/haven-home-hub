import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Link2, Sparkles, CheckCircle2, AlertTriangle, Eye, Upload, Save, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ChipInput } from "@/components/ui/chip-input";

export function AdminPropertyImport() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(true);

  const [showDebug, setShowDebug] = useState(false);

  // Check if properties with same url exist
  const checkDuplicate = async (externalUrl: string) => {
    const { data } = await supabase.from("properties" as any).select("id, title").eq("external_url", externalUrl).single();
    return data as any;
  };

  const extractMutation = useMutation({
    mutationFn: async () => {
      if (!url) throw new Error("Please enter a valid URL");
      
      const duplicate = await checkDuplicate(url);
      if (duplicate) {
        throw new Error(`Property already exists: ${duplicate.title}`);
      }

      const { data, error } = await supabase.functions.invoke("extract-property", {
        body: { url }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Extraction failed");
      if (!data?.data || Object.keys(data.data).length === 0) throw new Error("Received empty payload from extraction");
      
      return data.data;
    },
    onSuccess: (data) => {
      toast({ title: "Extraction complete!", description: "Review the extracted schema below." });
      
      // EXPLICIT SCHEMA MAPPING LAYER
      // Normalize external fields (beds, sqft) to platform schema (bedrooms, size_sqm)
      const mappedProperty = {
        title: data.title || "",
        description: data.description || "",
        // DB Schema: property_type = buy/rent/land (ENUM)
        // DB Schema: property_category = house/apartment/etc (TEXT)
        property_type: (data.property_type && ["buy", "rent", "land"].includes(data.property_type)) ? data.property_type : 
                      (data.property_category && ["buy", "rent", "land"].includes(data.property_category)) ? data.property_category : "buy",
        
        property_category: (data.property_category && !["buy", "rent", "land"].includes(data.property_category)) ? data.property_category :
                          (data.property_type && !["buy", "rent", "land"].includes(data.property_type)) ? data.property_type : "house",
        
        price: data.price || 0,
        currency: data.currency || "USD",
        bedrooms: data.bedrooms || data.beds || 0,
        bathrooms: data.bathrooms || data.baths || 0,
        size_sqm: data.size_sqm || data.sqft || 0,
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        country: data.country || "",
        interior_features: Array.isArray(data.interior_features) ? data.interior_features : [],
        exterior_features: Array.isArray(data.exterior_features) ? data.exterior_features : [],
        cover_image_url: data.cover_image_url || "",
        gallery_images: Array.isArray(data.gallery_images) ? data.gallery_images : [],
        
        // System defaults
        external_url: url,
        status: data.status || "available",
        featured: data.featured || false,
        
        // Retain original raw payload for debugging
        _rawPayload: data
      };

      setExtractedData(mappedProperty);
      setIsEditMode(true);
    },
    onError: (error: any) => {
      toast({ title: "Extraction Failed", description: error.message, variant: "destructive" });
    }
  });

  const publishMutation = useMutation({
    mutationFn: async (publishAsDraft: boolean) => {
      if (!extractedData) throw new Error("No data to publish");
      
      // Clean up for insert
      const { gallery_images, nearby_pois, _rawPayload, ...insertData } = extractedData;
      
      // Assign owner to admin or system
      insertData.owner_user_id = user?.id;
      insertData.slug = insertData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substr(2, 5);
      
      if (publishAsDraft) {
        insertData.status = "draft";
        insertData.approval_status = "pending";
      } else {
        insertData.approval_status = "approved";
      }

      // 1. Insert property
      const { data: propData, error: propError } = await supabase
        .from("properties")
        .insert([insertData])
        .select()
        .single();
        
      if (propError) throw propError;

      // 2. Insert gallery images
      if (gallery_images && gallery_images.length > 0) {
        const imagesToInsert = gallery_images.map((imgUrl: string, idx: number) => ({
          property_id: propData.id,
          url: imgUrl, // Column is 'url', not 'image_url'
          sort_order: idx + 1 // Column is 'sort_order', not 'display_order'
        }));
        const { error: imageError } = await supabase.from("property_images").insert(imagesToInsert);
        if (imageError) {
          console.error("Failed to insert gallery images:", imageError);
          // We don't necessarily want to rollback the whole property if just images fail,
          // but we should log it.
        }
      }

      return propData;
    },
    onSuccess: (data, publishAsDraft) => {
      toast({ 
        title: publishAsDraft ? "Saved as Draft" : "Property Published!", 
        description: `Successfully added ${data.title}` 
      });
      setExtractedData(null);
      setUrl("");
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
    },
    onError: (error: any) => {
      toast({ title: "Publish failed", description: error.message, variant: "destructive" });
    }
  });

  const handleFieldChange = (field: string, value: any) => {
    setExtractedData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Property Seeding
          </h2>
          <p className="text-muted-foreground text-sm">Automatically extract and normalize property listings from external sources.</p>
        </div>
      </div>

      {!extractedData && (
        <div className="max-w-2xl bg-card border border-border p-6 rounded-xl shadow-sm space-y-6">
          <div className="space-y-4">
            <Label>External Property URL</Label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="https://www.zillow.com/homedetails/..." 
                  className="pl-9"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => extractMutation.mutate()} 
                disabled={!url || extractMutation.isPending}
                className="gap-2"
              >
                {extractMutation.isPending ? "Extracting..." : "Run AI Extraction"}
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports Zillow, Realtor.com, Trulia, and standard property sites. The AI will normalize the schema to match our platform standards.
            </p>
          </div>
        </div>
      )}

      {extractedData && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border p-4 bg-muted/20 flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-rose-500" />
                  Review & Edit Schema
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  <Label htmlFor="edit-mode">Edit Mode</Label>
                  <Switch id="edit-mode" checked={isEditMode} onCheckedChange={setIsEditMode} />
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label>Property Title</Label>
                  <Input 
                    value={extractedData.title || ""} 
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                    disabled={!isEditMode}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select disabled={!isEditMode} value={extractedData.property_type || ""} onValueChange={(val) => handleFieldChange("property_type", val)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="rent">Rent</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select disabled={!isEditMode} value={extractedData.property_category || ""} onValueChange={(val) => handleFieldChange("property_category", val)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="land">Land Plot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Price</Label>
                    <Input type="number" value={extractedData.price || 0} onChange={(e) => handleFieldChange("price", Number(e.target.value))} disabled={!isEditMode} />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value={extractedData.currency || "USD"} onChange={(e) => handleFieldChange("currency", e.target.value)} disabled={!isEditMode} />
                  </div>
                  <div className="space-y-2">
                    <Label>Beds</Label>
                    <Input type="number" value={extractedData.bedrooms || 0} onChange={(e) => handleFieldChange("bedrooms", Number(e.target.value))} disabled={!isEditMode} />
                  </div>
                  <div className="space-y-2">
                    <Label>Baths</Label>
                    <Input type="number" value={extractedData.bathrooms || 0} onChange={(e) => handleFieldChange("bathrooms", Number(e.target.value))} disabled={!isEditMode} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={extractedData.address || ""} onChange={(e) => handleFieldChange("address", e.target.value)} disabled={!isEditMode} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={extractedData.city || ""} onChange={(e) => handleFieldChange("city", e.target.value)} disabled={!isEditMode} />
                    </div>
                    <div className="space-y-2">
                      <Label>State/Region</Label>
                      <Input value={extractedData.state || ""} onChange={(e) => handleFieldChange("state", e.target.value)} disabled={!isEditMode} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    rows={6} 
                    value={extractedData.description || ""} 
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    disabled={!isEditMode}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <Label className="text-base">Interior Features</Label>
                    <ChipInput 
                      value={extractedData.interior_features || []} 
                      onChange={(val) => handleFieldChange("interior_features", val)}
                      disabled={!isEditMode}
                      placeholder="e.g. Hardwood Floors, Smart Home System..."
                    />
                    <p className="text-xs text-muted-foreground">Press Enter or comma to add a feature.</p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base">Exterior Features</Label>
                    <ChipInput 
                      value={extractedData.exterior_features || []} 
                      onChange={(val) => handleFieldChange("exterior_features", val)}
                      disabled={!isEditMode}
                      placeholder="e.g. Swimming Pool, Solar Panels..."
                    />
                    <p className="text-xs text-muted-foreground">Press Enter or comma to add a feature.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-6">
              <h3 className="font-medium border-b border-border pb-3">Media Review</h3>
              
              {extractedData.cover_image_url ? (
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <img src={extractedData.cover_image_url} alt="Cover" className="w-full h-48 object-cover rounded-lg border border-border" />
                  {isEditMode && (
                    <Input value={extractedData.cover_image_url} onChange={(e) => handleFieldChange("cover_image_url", e.target.value)} />
                  )}
                </div>
              ) : (
                <div className="h-48 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground flex-col gap-2">
                  <AlertTriangle className="h-6 w-6" />
                  <p className="text-sm">No cover image extracted</p>
                </div>
              )}

              {extractedData.gallery_images && extractedData.gallery_images.length > 0 && (
                <div className="space-y-2">
                  <Label>Gallery ({extractedData.gallery_images.length} images)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {extractedData.gallery_images.slice(0, 6).map((img: string, i: number) => (
                      <img key={i} src={img} alt={`Gallery ${i}`} className="w-full aspect-square object-cover rounded-md border border-border" />
                    ))}
                    {extractedData.gallery_images.length > 6 && (
                      <div className="w-full aspect-square bg-muted rounded-md flex items-center justify-center text-xs font-medium">
                        +{extractedData.gallery_images.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-4 sticky top-6">
              <h3 className="font-medium border-b border-border pb-3">Publish Actions</h3>
              
              <div className="space-y-3">
                <Button 
                  className="w-full gap-2" 
                  onClick={() => publishMutation.mutate(false)}
                  disabled={publishMutation.isPending}
                >
                  <Upload className="h-4 w-4" />
                  Approve & Publish Live
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => publishMutation.mutate(true)}
                  disabled={publishMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  Save as Draft
                </Button>

                <Button 
                  variant="ghost" 
                  className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setExtractedData(null)}
                >
                  <X className="h-4 w-4" />
                  Discard Import
                </Button>
              </div>
            </div>

            {/* DEBUG VIEWER */}
            <div className="bg-card border border-border p-6 rounded-xl shadow-sm mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Extraction Debugger</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? "Hide Payload" : "View Raw Payload"}
                </Button>
              </div>
              
              {showDebug && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Raw Extracted Payload</Label>
                    <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-60">
                      {JSON.stringify(extractedData._rawPayload || {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Normalized Mapped Schema</Label>
                    <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-60 border-l-4 border-primary">
                      {JSON.stringify(
                        (() => {
                          const { _rawPayload, ...safePayload } = extractedData;
                          return safePayload;
                        })(), 
                        null, 
                        2
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

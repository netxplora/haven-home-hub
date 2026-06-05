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
import { Link2, Sparkles, CheckCircle2, AlertTriangle, Upload, Save, X, Loader2, ShieldAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ChipInput } from "@/components/ui/chip-input";

// ── Normalize Edge Function response to refined schema keys ─────────
// Handles both OLD format (title, price, property_type, bedrooms, etc.)
// and NEW format (property_title, base_price, listing_type, beds, etc.)
function normalizeExtractedData(raw: Record<string, any>): Record<string, any> {
  return {
    property_title:        raw.property_title        || raw.title           || "",
    property_description:  raw.property_description  || raw.description     || "",
    listing_type:          raw.listing_type           || raw.property_type   || "buy",
    property_category:     raw.property_category      || "house",
    base_price:            raw.base_price != null     ? Number(raw.base_price) : (raw.price != null ? Number(raw.price) : 0),
    currency:              raw.currency               || "USD",
    full_street_address:   raw.full_street_address    || raw.address         || "",
    city:                  raw.city                   || "",
    state:                 raw.state                  || "",
    country:               raw.country                || "",
    latitude:              raw.latitude               ?? null,
    longitude:             raw.longitude              ?? null,
    beds:                  raw.beds                   ?? raw.bedrooms        ?? null,
    baths:                 raw.baths                  ?? raw.bathrooms       ?? null,
    parking:               raw.parking                ?? raw.parking_spaces  ?? null,
    sqm:                   raw.sqm                    ?? raw.size_sqm        ?? null,
    year:                  raw.year                   ?? raw.year_built      ?? null,
    interior_features:     Array.isArray(raw.interior_features) ? raw.interior_features : [],
    exterior_features:     Array.isArray(raw.exterior_features) ? raw.exterior_features : [],
    nearby_points_of_interest: Array.isArray(raw.nearby_points_of_interest) ? raw.nearby_points_of_interest
                             : (Array.isArray(raw.nearby_pois) ? raw.nearby_pois : []),
    viewing_times:         raw.viewing_times          || raw.inspection_availability || "",
    primary_cover_image_url: raw.primary_cover_image_url || raw.cover_image_url || "",
    property_media_gallery: Array.isArray(raw.property_media_gallery) ? raw.property_media_gallery
                          : (Array.isArray(raw.gallery_images) ? raw.gallery_images : []),
  };
}

// ── Mapping from refined extraction keys → database column names ────
function mapExtractedToDbPayload(extracted: Record<string, any>, userId: string) {
  const slug =
    (extracted.property_title || "property")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).substr(2, 5);

  return {
    title: extracted.property_title || "",
    slug,
    description: extracted.property_description || "",
    price: Number(extracted.base_price) || 0,
    currency: extracted.currency || "USD",
    property_type: extracted.listing_type || "buy",
    property_category: extracted.property_category || "house",
    address: extracted.full_street_address || null,
    city: extracted.city || null,
    state: extracted.state || null,
    country: extracted.country || null,
    latitude: extracted.latitude ?? null,
    longitude: extracted.longitude ?? null,
    bedrooms: extracted.beds != null ? Number(extracted.beds) : null,
    bathrooms: extracted.baths != null ? Number(extracted.baths) : null,
    parking_spaces: extracted.parking != null ? Number(extracted.parking) : 0,
    size_sqm: extracted.sqm != null ? Number(extracted.sqm) : null,
    year_built: extracted.year != null ? Number(extracted.year) : null,
    interior_features: Array.isArray(extracted.interior_features) ? extracted.interior_features : [],
    exterior_features: Array.isArray(extracted.exterior_features) ? extracted.exterior_features : [],
    nearby_pois: Array.isArray(extracted.nearby_points_of_interest) ? extracted.nearby_points_of_interest : [],
    inspection_availability: extracted.viewing_times || "Available for viewing Monday to Saturday, 9AM - 5PM.",
    cover_image_url: extracted.primary_cover_image_url || null,
    external_url: extracted._source_url || null,
    owner_user_id: userId,
  };
}

export function AdminPropertyImport() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("pending");
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [validationInfo, setValidationInfo] = useState<{ status: string; missing_fields: string[] } | null>(null);
  const [isEditMode, setIsEditMode] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  // Check if property with same url exists
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

      setJobStatus("initializing");

      // 1. Insert job into the queue
      const { data: jobData, error: jobError } = await supabase
        .from('extraction_jobs')
        .insert([{ url, status: 'initializing' }])
        .select()
        .single();

      if (jobError) throw jobError;
      const id = jobData.id;
      setJobId(id);

      try {
        setJobStatus("extracting_structured");
        await supabase
          .from('extraction_jobs')
          .update({ status: 'extracting_structured' })
          .eq('id', id);

        // 2. Invoke Edge Function
        const { data: resData, error: funcError } = await supabase.functions.invoke("extract-property", {
          body: { url }
        });

        if (funcError) throw funcError;
        if (!resData || !resData.success) {
          throw new Error(resData?.error || "Extraction failed");
        }

        // Determine if extraction is complete or incomplete
        const extractionStatus = resData.validation?.status || "complete";

        setJobStatus("mapping");
        await supabase
          .from('extraction_jobs')
          .update({ status: 'mapping' })
          .eq('id', id);

        // 3. Complete job in database
        await supabase
          .from('extraction_jobs')
          .update({ 
            status: extractionStatus === "incomplete_import" ? "incomplete_import" : "completed", 
            extracted_data: resData.data, 
            completed_at: new Date().toISOString() 
          })
          .eq('id', id);

        return { data: resData.data, validation: resData.validation };
      } catch (err: any) {
        if (id) {
          await supabase
            .from('extraction_jobs')
            .update({ 
              status: 'failed', 
              error_message: err.message || "Unknown error" 
            })
            .eq('id', id);
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      const { data, validation } = result;
      // Normalize data to handle both old and new edge function response formats
      const normalizedData = normalizeExtractedData(data);
      // Attach source URL for DB mapping
      normalizedData._source_url = url;
      setExtractedData(normalizedData);
      setValidationInfo(validation || null);
      setIsEditMode(true);
      setJobId(null);

      if (validation?.status === "incomplete_import") {
        toast({
          title: "Partial extraction",
          description: `Extraction completed but ${validation.missing_fields.length} required field(s) are missing. Please review and fill them in.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Extraction complete!", description: "Review the extracted data below." });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Extraction Failed", 
        description: error.message || "Unknown error occurred", 
        variant: "destructive" 
      });
      setJobId(null);
    }
  });

  const publishMutation = useMutation({
    mutationFn: async (publishAsDraft: boolean) => {
      if (!extractedData) throw new Error("No data to publish");
      if (!user?.id) throw new Error("Not authenticated");

      // Re-check required fields before publish
      const requiredChecks = [
        { key: "property_title", label: "Property Title" },
        { key: "property_description", label: "Description" },
        { key: "listing_type", label: "Listing Type" },
        { key: "base_price", label: "Price" },
        { key: "primary_cover_image_url", label: "Cover Image" },
      ];
      const stillMissing = requiredChecks.filter(({ key }) => {
        const v = extractedData[key];
        if (!v || v === "") return true;
        if (key === "base_price" && (isNaN(Number(v)) || Number(v) <= 0)) return true;
        return false;
      });

      if (stillMissing.length > 0 && !publishAsDraft) {
        throw new Error(
          `Cannot publish live. Missing required fields: ${stillMissing.map((f) => f.label).join(", ")}. Save as draft instead.`
        );
      }

      // Build DB payload from refined keys
      const insertData = mapExtractedToDbPayload(extractedData, user.id);

      if (publishAsDraft) {
        (insertData as any).status = "draft";
        (insertData as any).approval_status = "pending";
      } else {
        (insertData as any).approval_status = "approved";
      }

      // 1. Insert property
      const { data: propData, error: propError } = await supabase
        .from("properties")
        .insert([insertData])
        .select()
        .single();
        
      if (propError) throw propError;

      // 2. Insert gallery images
      const gallery = extractedData.property_media_gallery;
      if (Array.isArray(gallery) && gallery.length > 0) {
        const imagesToInsert = gallery.map((imgUrl: string, idx: number) => ({
          property_id: propData.id,
          url: imgUrl,
          sort_order: idx + 1,
        }));
        const { error: imageError } = await supabase.from("property_images").insert(imagesToInsert);
        if (imageError) {
          console.error("Failed to insert gallery images:", imageError);
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
      setValidationInfo(null);
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

  // ── Field-label map for showing missing field names ────────────────
  const FIELD_LABELS: Record<string, string> = {
    property_title: "Property Title",
    property_description: "Description",
    listing_type: "Listing Type",
    base_price: "Price",
    primary_cover_image_url: "Cover Image",
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Property Import
          </h2>
          <p className="text-muted-foreground text-sm">Automatically extract and import property listings from external sources.</p>
        </div>
      </div>

      {!extractedData && !jobId && (
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
                {extractMutation.isPending ? "Extracting..." : "Run Extraction"}
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports Zillow, Realtor.com, Trulia, and most property listing websites. The system will scrape the page, extract listing data, and map it to the property schema for review.
            </p>
          </div>
        </div>
      )}

      {jobId && (
        <div className="max-w-2xl bg-card border border-border p-6 rounded-xl shadow-sm space-y-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <h3 className="text-xl font-medium">Extracting Property Data...</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize px-3 py-1 bg-muted">
                Status: {jobStatus.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Scraping the listing page, extracting structured data, and validating images. This may take up to 60 seconds for protected sites.
            </p>
          </div>
        </div>
      )}

      {extractedData && (
        <div className="space-y-6">
          {/* ── INCOMPLETE IMPORT WARNING ──────────────────────────── */}
          {validationInfo?.status === "incomplete_import" && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 flex items-start gap-4">
              <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-amber-600 dark:text-amber-400">
                  Incomplete Import — Manual Review Required
                </h4>
                <p className="text-sm text-muted-foreground">
                  The following required fields could not be extracted and must be filled in before publishing:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {validationInfo.missing_fields.map((field) => (
                    <Badge key={field} variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                      {FIELD_LABELS[field] || field}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="border-b border-border p-4 bg-muted/20 flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Review &amp; Edit Extracted Data
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Label htmlFor="edit-mode">Edit Mode</Label>
                    <Switch id="edit-mode" checked={isEditMode} onCheckedChange={setIsEditMode} />
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Property Title */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Property Title <span className="text-destructive">*</span></Label>
                      {validationInfo?.missing_fields.includes("property_title") && (
                        <Badge variant="destructive" className="text-[10px]">Required</Badge>
                      )}
                    </div>
                    <Input 
                      value={extractedData.property_title || ""} 
                      onChange={(e) => handleFieldChange("property_title", e.target.value)}
                      disabled={!isEditMode}
                      placeholder="Enter property title"
                    />
                  </div>

                  {/* Listing Type & Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Listing Type <span className="text-destructive">*</span></Label>
                      <Select disabled={!isEditMode} value={extractedData.listing_type || ""} onValueChange={(val) => handleFieldChange("listing_type", val)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">Buy</SelectItem>
                          <SelectItem value="rent">Rent</SelectItem>
                          <SelectItem value="land">Land</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Property Category</Label>
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

                  {/* Price, Currency, Beds, Baths */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Price <span className="text-destructive">*</span></Label>
                        {validationInfo?.missing_fields.includes("base_price") && (
                          <Badge variant="destructive" className="text-[10px]">Required</Badge>
                        )}
                      </div>
                      <Input type="number" value={extractedData.base_price || 0} onChange={(e) => handleFieldChange("base_price", Number(e.target.value))} disabled={!isEditMode} />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Input value={extractedData.currency || "USD"} onChange={(e) => handleFieldChange("currency", e.target.value)} disabled={!isEditMode} />
                    </div>
                    <div className="space-y-2">
                      <Label>Beds</Label>
                      <Input type="number" value={extractedData.beds ?? ""} onChange={(e) => handleFieldChange("beds", e.target.value === "" ? null : Number(e.target.value))} disabled={!isEditMode} />
                    </div>
                    <div className="space-y-2">
                      <Label>Baths</Label>
                      <Input type="number" value={extractedData.baths ?? ""} onChange={(e) => handleFieldChange("baths", e.target.value === "" ? null : Number(e.target.value))} disabled={!isEditMode} />
                    </div>
                  </div>

                  {/* Parking, SQM, Year */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Parking Spaces</Label>
                      <Input type="number" value={extractedData.parking ?? ""} onChange={(e) => handleFieldChange("parking", e.target.value === "" ? null : Number(e.target.value))} disabled={!isEditMode} />
                    </div>
                    <div className="space-y-2">
                      <Label>Size (sqm)</Label>
                      <Input type="number" value={extractedData.sqm ?? ""} onChange={(e) => handleFieldChange("sqm", e.target.value === "" ? null : Number(e.target.value))} disabled={!isEditMode} />
                    </div>
                    <div className="space-y-2">
                      <Label>Year Built</Label>
                      <Input type="number" value={extractedData.year ?? ""} onChange={(e) => handleFieldChange("year", e.target.value === "" ? null : Number(e.target.value))} disabled={!isEditMode} />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Street Address</Label>
                      <Input value={extractedData.full_street_address || ""} onChange={(e) => handleFieldChange("full_street_address", e.target.value)} disabled={!isEditMode} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input value={extractedData.country || ""} onChange={(e) => handleFieldChange("country", e.target.value)} disabled={!isEditMode} />
                    </div>
                    <div className="space-y-2">
                      <Label>Latitude</Label>
                      <Input type="number" step="any" value={extractedData.latitude ?? ""} onChange={(e) => handleFieldChange("latitude", e.target.value === "" ? null : Number(e.target.value))} disabled={!isEditMode} />
                    </div>
                    <div className="space-y-2">
                      <Label>Longitude</Label>
                      <Input type="number" step="any" value={extractedData.longitude ?? ""} onChange={(e) => handleFieldChange("longitude", e.target.value === "" ? null : Number(e.target.value))} disabled={!isEditMode} />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Description <span className="text-destructive">*</span></Label>
                      {validationInfo?.missing_fields.includes("property_description") && (
                        <Badge variant="destructive" className="text-[10px]">Required</Badge>
                      )}
                    </div>
                    <Textarea 
                      rows={6} 
                      value={extractedData.property_description || ""} 
                      onChange={(e) => handleFieldChange("property_description", e.target.value)}
                      disabled={!isEditMode}
                      placeholder="Enter property description"
                    />
                  </div>

                  {/* Viewing Times */}
                  <div className="space-y-2">
                    <Label>Viewing / Inspection Times</Label>
                    <Input 
                      value={extractedData.viewing_times || ""} 
                      onChange={(e) => handleFieldChange("viewing_times", e.target.value)}
                      disabled={!isEditMode}
                      placeholder="e.g. Saturday 10AM - 2PM"
                    />
                  </div>

                  {/* Features */}
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
              {/* Media Review */}
              <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-6">
                <h3 className="font-medium border-b border-border pb-3">Media Review</h3>
                
                {extractedData.primary_cover_image_url ? (
                  <div className="space-y-2">
                    <Label>Cover Image</Label>
                    <img src={extractedData.primary_cover_image_url} alt="Cover" className="w-full h-48 object-cover rounded-lg border border-border" />
                    {isEditMode && (
                      <Input value={extractedData.primary_cover_image_url} onChange={(e) => handleFieldChange("primary_cover_image_url", e.target.value)} />
                    )}
                  </div>
                ) : (
                  <div className="h-48 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground flex-col gap-2">
                    <AlertTriangle className="h-6 w-6" />
                    <p className="text-sm">No cover image extracted</p>
                    {isEditMode && (
                      <Input 
                        className="mt-2" 
                        placeholder="Paste image URL..." 
                        onChange={(e) => handleFieldChange("primary_cover_image_url", e.target.value)} 
                      />
                    )}
                  </div>
                )}

                {extractedData.property_media_gallery && extractedData.property_media_gallery.length > 0 && (
                  <div className="space-y-2">
                    <Label>Gallery ({extractedData.property_media_gallery.length} images)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {extractedData.property_media_gallery.slice(0, 6).map((img: string, i: number) => (
                        <img key={i} src={img} alt={`Gallery ${i}`} className="w-full aspect-square object-cover rounded-md border border-border" />
                      ))}
                      {extractedData.property_media_gallery.length > 6 && (
                        <div className="w-full aspect-square bg-muted rounded-md flex items-center justify-center text-xs font-medium">
                          +{extractedData.property_media_gallery.length - 6}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Publish Actions */}
              <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-4 sticky top-6">
                <h3 className="font-medium border-b border-border pb-3">Publish Actions</h3>
                
                <div className="space-y-3">
                  <Button 
                    className="w-full gap-2" 
                    onClick={() => publishMutation.mutate(false)}
                    disabled={publishMutation.isPending || validationInfo?.status === "incomplete_import"}
                  >
                    <Upload className="h-4 w-4" />
                    Approve &amp; Publish Live
                  </Button>

                  {validationInfo?.status === "incomplete_import" && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                      Fill in all required fields to enable live publishing.
                    </p>
                  )}
                  
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
                    onClick={() => { setExtractedData(null); setValidationInfo(null); }}
                  >
                    <X className="h-4 w-4" />
                    Discard Import
                  </Button>
                </div>
              </div>

              {/* Debug Viewer */}
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
                      <Label className="text-xs text-muted-foreground mb-2 block">Extracted Payload (Refined Schema)</Label>
                      <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-60 border-l-4 border-primary">
                        {JSON.stringify(extractedData, null, 2)}
                      </pre>
                    </div>
                    {validationInfo && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Validation Result</Label>
                        <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-40">
                          {JSON.stringify(validationInfo, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

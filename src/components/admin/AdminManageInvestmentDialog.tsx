import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BarChart3, LineChart, ShieldCheck, TrendingUp, Loader2, Upload } from "lucide-react";

interface AdminManageInvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: any;
}

export function AdminManageInvestmentDialog({ open, onOpenChange, investment }: AdminManageInvestmentDialogProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Form states
  const [status, setStatus] = useState(investment?.status || "pending");
  const [unitsOwned, setUnitsOwned] = useState(investment?.units_owned || 0);
  const [amountInvested, setAmountInvested] = useState(investment?.amount_invested || investment?.total_amount || 0);
  const [accruedEarnings, setAccruedEarnings] = useState(investment?.accrued_earnings || 0);
  
  // Dates
  const [startDate, setStartDate] = useState<string>(
    investment?.start_date ? new Date(investment.start_date).toISOString().split('T')[0] : ""
  );
  const [maturityDate, setMaturityDate] = useState<string>(
    investment?.maturity_date ? new Date(investment.maturity_date).toISOString().split('T')[0] : ""
  );

  // Liquidity
  const [secondaryMarket, setSecondaryMarket] = useState(investment?.secondary_market_enabled || false);

  // Document Upload
  const [uploading, setUploading] = useState(false);

  const { mutate: handleSave, isPending } = useMutation({
    mutationFn: async () => {
      const payload = {
        status,
        units_owned: Number(unitsOwned),
        amount_invested: Number(amountInvested),
        total_amount: Number(amountInvested),
        accrued_earnings: Number(accruedEarnings),
        start_date: startDate ? new Date(startDate).toISOString() : null,
        maturity_date: maturityDate ? new Date(maturityDate).toISOString() : null,
        secondary_market_enabled: secondaryMarket,
      };

      const { error } = await supabase
        .from("user_investments")
        .update(payload)
        .eq("id", investment.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-investments"] });
      qc.invalidateQueries({ queryKey: ["portfolio-detail", investment.id] });
      toast({ title: "Investment Updated", description: "All changes have been saved." });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `certificates/${investment.id}_${Date.now()}.${fileExt}`;

      // Assume 'investment_documents' bucket exists. If not, this throws
      const { error: uploadError } = await supabase.storage
        .from('investment_documents')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('investment_documents')
        .getPublicUrl(filePath);

      // Save to signed_documents (reference_id = investment.id)
      const { error: dbError } = await supabase
        .from('signed_documents')
        .insert({
          user_id: investment.user_id,
          document_type: 'certificate',
          reference_id: investment.id,
          signature_data: publicUrl,
          document_snapshot: `Official certificate uploaded manually by admin on ${new Date().toISOString()}`
        });

      if (dbError) throw dbError;

      toast({ title: "Document Uploaded", description: "The official certificate is now visible to the investor." });
      qc.invalidateQueries({ queryKey: ["portfolio-documents", investment.id] });
      
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message || "Ensure the 'investment_documents' bucket exists.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (!investment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Manage Investment</DialogTitle>
          <DialogDescription>
            Admin control center for investment <span className="font-mono text-primary">{investment.id.split('-')[0]}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid grid-cols-4 bg-muted/50 w-full rounded-xl">
            <TabsTrigger value="overview" className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Overview</TabsTrigger>
            <TabsTrigger value="journey" className="flex items-center gap-2"><LineChart className="w-4 h-4" /> Journey</TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Documents</TabsTrigger>
            <TabsTrigger value="liquidity" className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Liquidity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Amount Invested ($)</Label>
                <Input 
                  type="number" 
                  value={amountInvested} 
                  onChange={(e) => setAmountInvested(Number(e.target.value))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Units Owned</Label>
                <Input 
                  type="number" 
                  value={unitsOwned} 
                  onChange={(e) => setUnitsOwned(Number(e.target.value))} 
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Accrued Earnings ($)</Label>
                <Input 
                  type="number" 
                  value={accruedEarnings} 
                  onChange={(e) => setAccruedEarnings(Number(e.target.value))} 
                />
                <p className="text-xs text-muted-foreground mt-1">This directly dictates the Real-Time ROI dashboard shown to the user.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="journey" className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Investment Lifecycle Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="payment_under_review">Payment Under Review</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="active">Active (ROI Accruing)</SelectItem>
                    <SelectItem value="completed">Completed (Matured)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">Triggers 'ROI Activated' timeline step.</p>
                </div>
                <div className="space-y-2">
                  <Label>Maturity Date</Label>
                  <Input 
                    type="date" 
                    value={maturityDate} 
                    onChange={(e) => setMaturityDate(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">Controls maturity progress bar.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 pt-6">
            <div className="border-2 border-dashed border-border/60 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-muted/30 transition-colors">
              <Upload className="w-10 h-10 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Upload Official Certificate</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Upload a scanned PDF or image of the official ownership certificate. This will instantly appear in the investor's Document Hub.
              </p>
              
              <div className="relative">
                <Button disabled={uploading}>
                  {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {uploading ? "Uploading..." : "Select File"}
                </Button>
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  accept="application/pdf,image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="liquidity" className="space-y-6 pt-6">
            <div className="bg-muted/30 border border-border/50 rounded-xl p-6 flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-foreground mb-1">Enable Secondary Market</h4>
                <p className="text-sm text-muted-foreground max-w-md">
                  Allow the investor to click "Sell Units Now" and initiate a listing on the open marketplace. If disabled, their position is locked.
                </p>
              </div>
              <Switch 
                checked={secondaryMarket} 
                onCheckedChange={setSecondaryMarket} 
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-border/50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => handleSave()} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

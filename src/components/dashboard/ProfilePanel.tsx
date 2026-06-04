import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, ShieldAlert, ClipboardList, User, Phone, Mail, Upload, CheckCircle2, ChevronRight, FileText, Clock, Copy, CalendarDays, BadgeCheck, Info, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getAvatarUrl } from "@/lib/utils";

export function ProfilePanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { user, roles, refreshProfile } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [kycStep, setKycStep] = useState(1);

  // Resolve avatar public URL
  const avatarPublicUrl = getAvatarUrl(profile?.avatar_url);

  // Restore values from LocalStorage drafts if they exist
  useEffect(() => {
    if (profile) {
      const draftName = localStorage.getItem(`profile_draft_name_${userId}`);
      const draftPhone = localStorage.getItem(`profile_draft_phone_${userId}`);
      setForm({
        full_name: draftName !== null ? draftName : (profile.full_name ?? ""),
        phone: draftPhone !== null ? draftPhone : (profile.phone ?? "")
      });
    }
    
    // Auto-advance KYC steps based on existing uploads or offline step draft
    const draftKycStep = localStorage.getItem(`profile_draft_kyc_step_${userId}`);
    if (draftKycStep) {
      setKycStep(Number(draftKycStep));
    } else if (profile?.id_document_url && profile?.proof_of_address_url && profile?.kyc_status === 'unverified') {
      setKycStep(3);
    } else if (profile?.id_document_url && profile?.kyc_status === 'unverified') {
      setKycStep(2);
    }
  }, [profile, userId]);

  // Auto-save form field changes to LocalStorage drafts
  useEffect(() => {
    if (!profile) return;
    const isNameChanged = form.full_name !== (profile.full_name ?? "");
    const isPhoneChanged = form.phone !== (profile.phone ?? "");
    
    if (isNameChanged) {
      localStorage.setItem(`profile_draft_name_${userId}`, form.full_name);
    }
    if (isPhoneChanged) {
      localStorage.setItem(`profile_draft_phone_${userId}`, form.phone);
    }
  }, [form, profile, userId]);

  // Auto-save current KYC step progress to LocalStorage
  useEffect(() => {
    localStorage.setItem(`profile_draft_kyc_step_${userId}`, String(kycStep));
  }, [kycStep, userId]);

  // Profile completeness calculation
  const completenessFields = [
    !!profile?.full_name,
    !!profile?.phone,
    !!user?.email,
    !!profile?.avatar_url,
    profile?.kyc_status === "approved",
    !!profile?.id_document_url,
    !!profile?.proof_of_address_url,
  ];
  const completenessScore = Math.round(
    (completenessFields.filter(Boolean).length / completenessFields.length) * 100
  );

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG, or WebP image.", variant: "destructive" });
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Profile picture must be under 2MB.", variant: "destructive" });
      return;
    }

    const ext = file.name.split('.').pop();
    const filePath = `${userId}/avatar_${Date.now()}.${ext}`;

    setUploadingAvatar(true);
    try {
      // Delete old avatar if it exists
      if (profile?.avatar_url) {
        await supabase.storage.from("avatars").remove([profile.avatar_url]);
      }

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: filePath }).eq("id", userId);
      if (updateError) throw updateError;

      toast({ title: "Profile picture updated" });
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      await refreshProfile();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      ...form,
    });
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { 
      toast({ title: "Profile updated" }); 
      // Clear offline drafts on successful save
      localStorage.removeItem(`profile_draft_name_${userId}`);
      localStorage.removeItem(`profile_draft_phone_${userId}`);
      qc.invalidateQueries({ queryKey: ["profile", userId] }); 
    }
  }

  async function handleKycUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'id_document' | 'proof_of_address') {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${type}_${Date.now()}_${originalName}`;
    
    setUploadingKyc(true);
    try {
      const { error: uploadError } = await supabase.storage.from("kyc_documents").upload(filePath, file);
      if (uploadError) throw uploadError;

      const updateData = type === 'id_document' 
        ? { id_document_url: filePath }
        : { proof_of_address_url: filePath };

      const { error: updateError } = await supabase.from("profiles").update(updateData).eq("id", userId);
      if (updateError) throw updateError;
      
      toast({ title: "Document uploaded successfully", description: "You can now proceed to the next step." });
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      
      if (type === 'id_document') setKycStep(2);
      else if (type === 'proof_of_address') setKycStep(3);
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingKyc(false);
    }
  }

  async function submitKyc() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ kyc_status: "pending" }).eq("id", userId);
    setSaving(false);
    if (error) toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "KYC Submitted", description: "Your documents are now under review." });
      // Clear offline step draft on successful final submission
      localStorage.removeItem(`profile_draft_kyc_step_${userId}`);
      qc.invalidateQueries({ queryKey: ["profile", userId] });
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  }

  if (isLoading) return (
    <div className="space-y-6">
       <Skeleton className="h-64 rounded-xl" />
       <Skeleton className="h-96 rounded-xl" />
    </div>
  );

  const kycStatus = profile?.kyc_status || 'unverified';

  return (
    <div className="grid gap-10 lg:grid-cols-5 ">
      <div className="lg:col-span-2 space-y-8">
        {/* Profile Form Card */}
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft">
          <div className="flex items-center gap-4 mb-6">
             {/* Profile Picture */}
             <div className="relative group">
               <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                 {avatarPublicUrl ? (
                   <img
                     src={avatarPublicUrl}
                     alt={profile?.full_name || "Profile"}
                     className="h-full w-full object-cover"
                   />
                 ) : (
                   <span className="font-serif font-semibold text-xl text-primary">
                     {profile?.full_name?.charAt(0) || "U"}
                   </span>
                 )}
               </div>
               <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                 {uploadingAvatar ? (
                   <Loader2 className="h-5 w-5 text-white animate-spin" />
                 ) : (
                   <Camera className="h-5 w-5 text-white" />
                 )}
                 <input
                   type="file"
                   accept="image/jpeg,image/png,image/webp"
                   className="sr-only"
                   onChange={handleAvatarUpload}
                   disabled={uploadingAvatar}
                 />
               </label>
             </div>
             <div>
                <h2 className="font-serif text-xl font-semibold">{profile?.full_name || "User Account"}</h2>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Investor Account</p>
             </div>
          </div>

          <form onSubmit={save} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-1">Full Identity Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input 
                  value={form.full_name} 
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                  maxLength={100} 
                  className="pl-10 rounded-lg bg-accent/50 border-border/50 focus-visible:ring-primary/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-1">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input 
                  value={user?.email || ""} 
                  readOnly
                  disabled
                  className="pl-10 rounded-lg bg-accent/30 border-border/50 text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-1">Contact Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input 
                  value={form.phone} 
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                  maxLength={40} 
                  className="pl-10 rounded-lg bg-accent/50 border-border/50 focus-visible:ring-primary/20"
                />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-lg bg-primary font-medium h-11 shadow-sm">
               {saving ? "Processing..." : "Update Profile"}
            </Button>
          </form>
        </div>

        {/* Account Details Card */}
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft space-y-5">
          <h3 className="font-serif text-base font-semibold">Account Details</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Account ID</p>
                <p className="text-sm font-mono text-foreground">{userId.slice(0, 12)}...</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-accent" onClick={() => copyToClipboard(userId)}>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            <div className="h-px bg-border/40" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Member Since</p>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/50" />
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "N/A"}
                </p>
              </div>
            </div>
            <div className="h-px bg-border/40" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Account Role</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {roles.length > 0 ? roles.map(r => (
                    <Badge key={r} variant="secondary" className="rounded-md text-[10px] uppercase font-bold px-2 py-0.5">{r}</Badge>
                  )) : (
                    <Badge variant="outline" className="rounded-md text-[10px] uppercase font-bold px-2 py-0.5">User</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="h-px bg-border/40" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">KYC Verification</p>
                <Badge variant={kycStatus === 'approved' ? 'default' : kycStatus === 'pending' ? 'secondary' : kycStatus === 'rejected' ? 'destructive' : 'outline'} 
                  className="capitalize rounded-md text-[10px] font-bold mt-1 gap-1">
                  {kycStatus === 'approved' && <ShieldCheck className="h-3 w-3" />}
                  {kycStatus === 'rejected' && <ShieldAlert className="h-3 w-3" />}
                  {kycStatus === 'pending' && <Clock className="h-3 w-3" />}
                  {kycStatus === 'approved' ? 'Verified' : kycStatus === 'pending' ? 'Under Review' : kycStatus === 'rejected' ? 'Declined' : 'Not Verified'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Completeness Card */}
        <div className="rounded-xl border border-border/50 bg-accent/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold">Profile Completeness</h3>
            <span className="text-sm font-bold text-primary">{completenessScore}%</span>
          </div>
          <Progress value={completenessScore} className="h-2" />
          <div className="space-y-2">
            {[
              { label: "Profile Picture", done: !!profile?.avatar_url },
              { label: "Full Name", done: !!profile?.full_name },
              { label: "Phone Number", done: !!profile?.phone },
              { label: "Email Address", done: !!user?.email },
              { label: "ID Document", done: !!profile?.id_document_url },
              { label: "Address Proof", done: !!profile?.proof_of_address_url },
              { label: "KYC Approved", done: profile?.kyc_status === "approved" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                {item.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/20 shrink-0" />
                )}
                <span className={item.done ? "text-foreground font-medium" : "text-muted-foreground"}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Preferences */}
        <div className="rounded-xl border border-border/50 bg-accent/30 p-6 space-y-5">
           <h3 className="font-serif text-base font-semibold">Security Preferences</h3>
           <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                    <p className="text-sm font-medium">2FA Authentication</p>
                    <p className="text-xs text-muted-foreground">Protect your wallet with two-factor auth</p>
                 </div>
                 <Badge variant="outline" className="rounded-lg text-[10px] opacity-50">Locked</Badge>
              </div>
              <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                    <p className="text-sm font-medium">Login Alerts</p>
                    <p className="text-xs text-muted-foreground">Get notified of new login attempts</p>
                 </div>
                 <Badge className="bg-green-500/10 text-green-600 border-green-500/20 rounded-lg text-[10px]">Active</Badge>
              </div>
           </div>
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft h-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
               <h3 className="font-serif text-lg font-semibold">Identity Verification (KYC)</h3>
               <p className="text-xs text-muted-foreground mt-1">Required for institutional investment compliance.</p>
            </div>
            <Badge variant={kycStatus === 'approved' ? 'default' : kycStatus === 'rejected' ? 'destructive' : kycStatus === 'pending' ? 'secondary' : 'outline'} className="capitalize px-3 py-1 rounded-md text-xs font-medium tracking-wider">
              {kycStatus === 'approved' && <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />}
              {kycStatus === 'rejected' && <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />}
              {kycStatus === 'unverified' ? 'NOT VERIFIED' : kycStatus.toUpperCase()}
            </Badge>
          </div>

          {kycStatus === 'approved' ? (
            <div className="text-sm text-muted-foreground bg-green-500/10 p-8 rounded-xl flex flex-col items-center text-center gap-4 border border-green-500/20">
              <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-600">
                 <ShieldCheck className="w-10 h-10" />
              </div>
              <div>
                 <p className="font-serif text-lg font-semibold text-foreground">Verified Investor</p>
                 <p className="mt-2 leading-relaxed max-w-sm">Your identity has been fully verified. You have complete access to all investment vehicles and portfolio management tools.</p>
              </div>
              <Button variant="outline" className="mt-2 rounded-lg border-green-500/30 text-green-700 font-medium px-6">View Documents</Button>
            </div>
          ) : kycStatus === 'pending' ? (
            <div className="text-sm text-muted-foreground bg-accent/50 p-8 rounded-xl flex flex-col items-center text-center gap-4 border border-border">
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground/60">
                 <ClipboardList className="w-10 h-10" />
              </div>
              <div>
                 <p className="font-serif text-lg font-semibold text-foreground">Review in Progress</p>
                 <p className="mt-2 leading-relaxed max-w-sm">Our compliance team is auditing your credentials. This process typically takes 24-48 business hours.</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wider px-4 py-1.5 bg-primary/10 rounded-full">
                 <Clock className="h-3.5 w-3.5" /> Awaiting Final Audit
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
                 {[1, 2, 3].map(step => (
                    <div key={step} className="space-y-3 relative z-10">
                       <div className={`h-1.5 rounded-full transition-all duration-500 ${kycStep >= step ? 'bg-primary' : 'bg-secondary'}`} />
                       <p className={`text-[10px] font-medium uppercase tracking-wider text-center ${kycStep === step ? 'text-primary' : 'text-muted-foreground opacity-50'}`}>Step {step}</p>
                    </div>
                 ))}
              </div>

              {kycStatus === 'rejected' && profile?.kyc_rejection_reason && (
                <div className="text-sm text-destructive bg-destructive/10 p-6 rounded-xl flex gap-4 border border-destructive/20">
                  <ShieldAlert className="w-6 h-6 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-lg">Verification Refused</p>
                    <p className="mt-1 opacity-90 leading-relaxed">{profile.kyc_rejection_reason}</p>
                  </div>
                </div>
              )}

              {kycStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                     <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="h-6 w-6" />
                     </div>
                     <div>
                       <h4 className="font-serif text-base font-semibold">Government-Issued Identity</h4>
                       <p className="text-sm text-muted-foreground mt-1">Please provide a high-resolution scan of your Passport, Driver's License, or National ID Card.</p>
                     </div>
                  </div>
                  
                  <div className="p-8 rounded-xl border-2 border-dashed border-border/60 bg-secondary/5 flex flex-col items-center justify-center gap-4 text-center group hover:border-primary/40 hover:bg-secondary/10 transition-all cursor-pointer relative">
                    <Upload className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                    <div className="space-y-1">
                       <p className="text-sm font-semibold">Click to select file</p>
                       <p className="text-xs text-muted-foreground">PDF, PNG or JPG (Max 5MB)</p>
                    </div>
                    <Input 
                      type="file" 
                      accept="image/*,.pdf" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleKycUpload(e, 'id_document')}
                      disabled={uploadingKyc}
                    />
                    {profile?.id_document_url && (
                       <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg">
                          <CheckCircle2 className="h-5 w-5" />
                       </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setKycStep(2)} disabled={!profile?.id_document_url} className="rounded-lg px-8 h-11 font-medium bg-primary hover:bg-primary/90">
                      Continue to Address Proof <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {kycStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                     <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Mail className="h-6 w-6" />
                     </div>
                     <div>
                       <h4 className="font-serif text-base font-semibold">Residency Verification</h4>
                       <p className="text-sm text-muted-foreground mt-1">Upload a utility bill or bank statement from the last 90 days showing your registered address.</p>
                     </div>
                  </div>

                  <div className="p-8 rounded-xl border-2 border-dashed border-border/60 bg-secondary/5 flex flex-col items-center justify-center gap-4 text-center group hover:border-primary/40 hover:bg-secondary/10 transition-all cursor-pointer relative">
                    <Upload className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                    <div className="space-y-1">
                       <p className="text-sm font-semibold">Click to select file</p>
                       <p className="text-xs text-muted-foreground">PDF, PNG or JPG (Max 5MB)</p>
                    </div>
                    <Input 
                      type="file" 
                      accept="image/*,.pdf" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleKycUpload(e, 'proof_of_address')}
                      disabled={uploadingKyc}
                    />
                    {profile?.proof_of_address_url && (
                       <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg">
                          <CheckCircle2 className="h-5 w-5" />
                       </div>
                    )}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button onClick={() => setKycStep(1)} variant="ghost" className="rounded-lg flex-1 h-11 font-medium">Previous Step</Button>
                    <Button onClick={() => setKycStep(3)} disabled={!profile?.proof_of_address_url} className="rounded-lg flex-[2] h-11 font-medium bg-primary hover:bg-primary/90">
                      Final Confirmation <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {kycStep === 3 && (
                <div className="space-y-8">
                  <div className="p-8 rounded-lg bg-secondary/20 border border-border space-y-6">
                     <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                     </div>
                     <div>
                         <h4 className="font-semibold">Protocol Confirmation</h4>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                           By submitting these documents, you confirm that all provided information is authentic and represents your legal identity for investment purposes. Haven Home Hub reserves the right to request additional documentation for AML/KYC compliance.
                        </p>
                     </div>
                     <div className="flex flex-wrap gap-3">
                        <Badge className="bg-primary/8 text-primary border-primary/15 rounded-md px-2.5 py-0.5 text-[10px] font-medium">ID DOCUMENT: ATTACHED</Badge>
                        <Badge className="bg-primary/8 text-primary border-primary/15 rounded-md px-2.5 py-0.5 text-[10px] font-medium">ADDRESS PROOF: ATTACHED</Badge>
                     </div>
                  </div>

                  <div className="flex gap-4">
                    <Button onClick={() => setKycStep(2)} variant="ghost" className="rounded-lg flex-1 h-11 font-medium">Review Documents</Button>
                    <Button onClick={submitKyc} disabled={saving} className="rounded-lg flex-[2] h-11 font-medium bg-primary shadow-sm">
                      {saving ? "Finalizing..." : "Submit for Verification"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

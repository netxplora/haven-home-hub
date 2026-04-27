import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Message too short").max(1000),
});

interface Props {
  propertyId: string;
  agentId?: string | null;
  onSuccess?: () => void;
}

export function InquiryForm({ propertyId, agentId, onSuccess }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: user?.email ?? "", phone: "", message: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Please fix the form", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("inquiries").insert({
      property_id: propertyId,
      agent_id: agentId ?? undefined,
      user_id: user?.id ?? undefined,
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
      phone: parsed.data.phone || undefined,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Inquiry sent", description: "An agent will get back to you shortly." });
    setForm({ name: "", email: user?.email ?? "", phone: "", message: "" });
    onSuccess?.();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="iq-name">Name</Label>
          <Input id="iq-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="iq-email">Email</Label>
          <Input id="iq-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="iq-phone">Phone (optional)</Label>
        <Input id="iq-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="iq-msg">Message</Label>
        <Textarea id="iq-msg" rows={4} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Hi, I'd like to know more about this property." />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-warm hover:opacity-95">
        {loading ? "Sending..." : "Send inquiry"}
      </Button>
    </form>
  );
}
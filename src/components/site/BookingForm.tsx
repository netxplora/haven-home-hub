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
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  preferred_date: z.string().min(1, "Pick a date"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

interface Props {
  propertyId: string;
  agentId?: string | null;
  onSuccess?: () => void;
}

export function BookingForm({ propertyId, agentId, onSuccess }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: user?.email ?? "", phone: "", preferred_date: "", notes: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Please fix the form", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("bookings").insert({
      property_id: propertyId,
      agent_id: agentId ?? undefined,
      user_id: user?.id ?? undefined,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || undefined,
      preferred_date: new Date(parsed.data.preferred_date).toISOString(),
      notes: parsed.data.notes || undefined,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Could not book", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Inspection requested", description: "Your agent will confirm shortly." });
    onSuccess?.();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="b-name">Name</Label>
          <Input id="b-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-email">Email</Label>
          <Input id="b-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="b-phone">Phone</Label>
          <Input id="b-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-date">Preferred date & time</Label>
          <Input id="b-date" type="datetime-local" required value={form.preferred_date}
            onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="b-notes">Notes</Label>
        <Textarea id="b-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Anything we should know before the inspection?" />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
        {loading ? "Booking..." : "Request inspection"}
      </Button>
    </form>
  );
}
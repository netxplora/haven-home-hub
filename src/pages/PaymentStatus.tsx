import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/invest";
import { AlertCircle, CheckCircle2, Clock, Copy, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function PaymentStatus() {
  const { id } = useParams();
  const [tick, setTick] = useState(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payment", id, tick],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*").eq("id", id!).maybeSingle();
      return data;
    },
    enabled: !!id,
    refetchInterval: (q) => {
      const s = (q.state.data as any)?.status;
      return s === "pending" || s === "processing" ? 4000 : false;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`payment-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payments", filter: `id=eq.${id}` }, () => setTick((t) => t + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  async function markPaid() {
    await supabase.functions.invoke("verify-payment", { body: { payment_id: id } });
    refetch();
  }

  if (isLoading) return <SiteLayout><div className="container-tight py-14"><Skeleton className="h-80" /></div></SiteLayout>;
  if (!data) return <SiteLayout><div className="container-tight py-14">Payment not found.</div></SiteLayout>;

  const statusMeta =
    data.status === "success" ? { icon: CheckCircle2, label: "Payment confirmed", tone: "text-accent" } :
    data.status === "failed" ? { icon: AlertCircle, label: "Payment failed", tone: "text-destructive" } :
    data.status === "processing" ? { icon: Loader2, label: "Processing…", tone: "text-primary animate-spin" } :
    { icon: Clock, label: "Awaiting confirmation", tone: "text-muted-foreground" };

  const Icon = statusMeta.icon;

  return (
    <SiteLayout>
      <div className="container-tight py-14">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lux">
          <div className="border-b border-border p-6">
            <div className="flex items-center gap-3">
              <Icon className={`h-6 w-6 ${statusMeta.tone}`} />
              <div>
                <h1 className="font-serif text-2xl font-semibold">{statusMeta.label}</h1>
                <p className="text-xs text-muted-foreground">Reference: {data.reference}</p>
              </div>
              <Badge className="ml-auto capitalize" variant={data.status === "success" ? "default" : data.status === "failed" ? "destructive" : "secondary"}>
                {data.status}
              </Badge>
            </div>
          </div>
          <div className="space-y-3 p-6">
            <Row label="Amount" value={formatMoney(Number(data.amount), data.currency)} />
            <Row label="Purpose" value={data.payment_type} capitalize />
            <Row label="Method" value={String(data.provider).replace("_"," ")} capitalize />

            {data.provider === "crypto" && data.crypto_address && data.status !== "success" && (
              <div className="mt-3 rounded-xl border border-border bg-secondary/60 p-4 text-sm">
                <p className="font-medium">Send exactly {data.crypto_amount} {data.crypto_currency?.toUpperCase()}</p>
                <p className="mt-1 text-xs text-muted-foreground break-all font-mono">{data.crypto_address}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => { navigator.clipboard.writeText(data.crypto_address!); toast({ title: "Address copied" }); }}>
                  <Copy className="mr-1 h-3 w-3" /> Copy address
                </Button>
              </div>
            )}

            {data.provider === "manual_bank" && data.status === "pending" && (
              <div className="mt-3 rounded-xl border border-border bg-secondary/60 p-4 text-sm space-y-2">
                <p className="font-medium">Wire your payment to:</p>
                <p>Account: <span className="font-mono">Please contact support for bank details</span></p>
                <p className="text-xs text-muted-foreground">Include reference <span className="font-mono">{data.reference}</span> in your wire memo. An admin will verify within 24 hours.</p>
                <Button size="sm" variant="outline" onClick={markPaid}>I have paid</Button>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
              {data.payment_type === "investment" && <Button asChild><Link to="/invest/portfolio">View portfolio</Link></Button>}
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}
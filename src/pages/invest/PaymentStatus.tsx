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
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
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

            {data.provider === "crypto" && data.crypto_address && data.status === "pending" && (
              <div className="mt-3 overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-card to-primary/10 shadow-sm">
                <div className="border-b border-border/50 bg-accent/50 p-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Send Exact Amount</p>
                  <p className="mt-1 font-serif text-2xl font-semibold text-primary">
                    {data.crypto_amount} <span className="text-lg">{data.crypto_currency?.toUpperCase()}</span>
                  </p>
                </div>
                
                <div className="p-5 flex flex-col sm:flex-row items-center gap-6">
                  <div className="shrink-0 rounded-lg border border-border bg-white p-2">
                    <img 
                      src={`https://quickchart.io/qr?text=${data.crypto_address}&size=150&margin=1`} 
                      alt="Wallet QR Code" 
                      className="h-32 w-32"
                    />
                  </div>
                  
                  <div className="flex-1 space-y-4 w-full">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Deposit Address</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-accent p-2 text-xs break-all">{data.crypto_address}</code>
                        <Button size="icon" variant="outline" className="shrink-0 h-8 w-8" onClick={() => { navigator.clipboard.writeText(data.crypto_address!); toast({ title: "Address copied" }); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Amount to Send</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-accent p-2 text-xs">{data.crypto_amount}</code>
                        <Button size="icon" variant="outline" className="shrink-0 h-8 w-8" onClick={() => { navigator.clipboard.writeText(String(data.crypto_amount)); toast({ title: "Amount copied" }); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-secondary/20 p-3 text-center border-t border-border/50 flex flex-col items-center justify-center">
                  <RateTimer createdAt={data.created_at} />
                </div>
              </div>
            )}

            {data.provider === "crypto" && data.status === "processing" && (
              <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-6 text-center space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <div>
                  <p className="font-serif text-lg font-semibold text-primary">Payment Detected</p>
                  <p className="text-sm text-muted-foreground mt-1">We've found your transaction on the blockchain. Awaiting final confirmations before securing your allocation.</p>
                </div>
              </div>
            )}

            {data.provider === "manual_bank" && data.status === "pending" && (
              <div className="mt-3 rounded-xl border border-border bg-accent p-4 text-sm space-y-2">
                <p className="font-medium">Wire your payment to:</p>
                <p>Account: <span className="font-mono">Please contact support for bank details</span></p>
                <p className="text-xs text-muted-foreground">Include reference <span className="font-mono">{data.reference}</span> in your wire memo. An admin will verify within 24 hours.</p>
                <Button size="sm" variant="outline" onClick={markPaid}>I have paid</Button>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
              {data.payment_type === "investment" && <Button asChild><Link to="/dashboard?tab=investments">View portfolio</Link></Button>}
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

function RateTimer({ createdAt }: { createdAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const expires = new Date(createdAt).getTime() + 60 * 60 * 1000; // 1 hour validity

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = expires - now;

      if (distance < 0) {
        clearInterval(interval);
        setExpired(true);
        setTimeLeft("00:00");
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  if (expired) {
    return <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Rate expired. Please create a new payment.</p>;
  }

  return (
    <p className="text-xs text-muted-foreground flex items-center gap-1">
      <Clock className="h-3 w-3" /> Rate guaranteed for <span className="font-mono font-medium text-foreground">{timeLeft}</span>
    </p>
  );
}

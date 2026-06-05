import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/invest";
import { Wallet, ArrowDownCircle, Building2, Landmark, CheckCircle2, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Withdrawals() {
  const { user, loading } = useAuth();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bank" | "crypto">("bank");
  const [bankDetails, setBankDetails] = useState({ name: "", accountName: "", accountNumber: "" });
  const [cryptoDetails, setCryptoDetails] = useState({ currency: "USDT", address: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["withdrawals_data", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [statsRes, historyRes] = await Promise.all([
        supabase.from("user_portfolio_stats").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("withdrawal_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      ]);
      return {
        stats: statsRes.data,
        history: historyRes.data || []
      };
    },
    enabled: !!user
  });

  if (loading) return <SiteLayout><div className="container-wide py-12"><Skeleton className="h-80" /></div></SiteLayout>;
  if (!user) return <Navigate to="/auth" replace />;

  const withdrawableBalance = data?.stats?.total_withdrawable_balance || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = Number(amount);
    
    if (withdrawAmount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount greater than 0.", variant: "destructive" });
      return;
    }
    
    if (withdrawAmount > withdrawableBalance) {
      toast({ title: "Insufficient balance", description: "You cannot withdraw more than your available balance.", variant: "destructive" });
      return;
    }

    if (method === "bank" && (!bankDetails.name || !bankDetails.accountName || !bankDetails.accountNumber)) {
      toast({ title: "Missing details", description: "Please complete all bank details.", variant: "destructive" });
      return;
    }

    if (method === "crypto" && (!cryptoDetails.currency || !cryptoDetails.address)) {
      toast({ title: "Missing details", description: "Please provide your crypto address.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: user.id,
        amount: withdrawAmount,
        currency: "USD",
        method: method,
        bank_name: method === "bank" ? bankDetails.name : null,
        bank_account_name: method === "bank" ? bankDetails.accountName : null,
        bank_account_number: method === "bank" ? bankDetails.accountNumber : null,
        crypto_currency: method === "crypto" ? cryptoDetails.currency : null,
        crypto_address: method === "crypto" ? cryptoDetails.address : null,
      });

      if (error) throw error;

      toast({ title: "Withdrawal Requested", description: "Your request has been submitted for review." });
      setAmount("");
      refetch();
    } catch (err: any) {
      toast({ title: "Request failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <div className="relative overflow-hidden min-h-[220px] flex items-center bg-secondary">
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 to-secondary/40 z-[1]" />
        <div className="container-wide relative z-10 text-white py-14">
          <p className="mb-2 text-xs font-medium tracking-wider uppercase text-primary">Funds & Payouts</p>
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl text-white">Withdrawals</h1>
        </div>
      </div>

      <div className="container-wide py-10">
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Request Form */}
          <div className="md:col-span-1 space-y-6">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
              <Wallet className="h-10 w-10 text-primary mx-auto mb-3" />
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Available to Withdraw</p>
              <p className="font-serif text-4xl font-bold text-foreground">
                {isLoading ? <Skeleton className="h-10 w-32 mx-auto" /> : formatMoney(withdrawableBalance)}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 border border-border/50 bg-card p-6 rounded-xl">
              <h3 className="font-serif text-lg font-semibold border-b border-border/40 pb-3">Request Payout</h3>
              
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Amount to Withdraw</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  className="h-12 font-bold text-lg"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Payout Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setMethod("bank")}
                    className={`flex items-center justify-center gap-2 border p-3 rounded-xl transition-all ${method === 'bank' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-accent/30 text-muted-foreground hover:bg-accent/50'}`}
                  >
                    <Landmark className="h-4 w-4" /> <span className="font-semibold text-sm">Bank Wire</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMethod("crypto")}
                    className={`flex items-center justify-center gap-2 border p-3 rounded-xl transition-all ${method === 'crypto' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-accent/30 text-muted-foreground hover:bg-accent/50'}`}
                  >
                    <Building2 className="h-4 w-4" /> <span className="font-semibold text-sm">Crypto</span>
                  </button>
                </div>
              </div>

              {method === "bank" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bank Name</Label>
                    <Input value={bankDetails.name} onChange={e => setBankDetails({...bankDetails, name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Account Holder Name</Label>
                    <Input value={bankDetails.accountName} onChange={e => setBankDetails({...bankDetails, accountName: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Account Number (IBAN/Routing)</Label>
                    <Input value={bankDetails.accountNumber} onChange={e => setBankDetails({...bankDetails, accountNumber: e.target.value})} />
                  </div>
                </div>
              )}

              {method === "crypto" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Currency Network</Label>
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={cryptoDetails.currency}
                      onChange={e => setCryptoDetails({...cryptoDetails, currency: e.target.value})}
                    >
                      <option value="USDT">USDT (ERC20 / TRC20)</option>
                      <option value="USDC">USDC (ERC20)</option>
                      <option value="BTC">Bitcoin</option>
                      <option value="ETH">Ethereum</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Wallet Address</Label>
                    <Input value={cryptoDetails.address} onChange={e => setCryptoDetails({...cryptoDetails, address: e.target.value})} />
                  </div>
                </div>
              )}

              <Button type="submit" disabled={submitting || withdrawableBalance <= 0} className="w-full h-12 font-bold uppercase tracking-wider text-xs">
                {submitting ? "Processing..." : "Submit Withdrawal"}
              </Button>
            </form>
          </div>

          {/* History */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="font-serif text-2xl font-semibold">Withdrawal History</h2>

            {/* Mobile Card Layout */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {isLoading ? (
                <Skeleton className="h-20 rounded-xl" />
              ) : data?.history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-muted-foreground">No withdrawals requested yet.</div>
              ) : (
                data?.history.map((req: any) => (
                  <div key={req.id} className="rounded-xl border border-border/40 bg-card p-5 shadow-soft space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {req.method === 'bank' ? <Landmark className="h-4 w-4 text-primary" /> : <Building2 className="h-4 w-4 text-primary" />}
                        <span className="capitalize font-semibold text-sm">{req.method}</span>
                      </div>
                      <div>
                        {req.status === 'pending' && <Badge variant="outline" className="text-amber-600 border-amber-600/30 bg-amber-50"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>}
                        {req.status === 'approved' && <Badge variant="outline" className="text-blue-600 border-blue-600/30 bg-blue-50">Approved</Badge>}
                        {req.status === 'processing' && <Badge variant="outline" className="text-blue-600 border-blue-600/30 bg-blue-50">Processing</Badge>}
                        {req.status === 'completed' && <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Completed</Badge>}
                        {req.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                        {req.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <span className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</span>
                      <span className="font-serif font-bold text-foreground">{formatMoney(Number(req.amount), req.currency)}</span>
                    </div>
                    {req.method === 'crypto' && <p className="text-[10px] text-muted-foreground font-mono">{req.crypto_address?.slice(0,20)}...</p>}
                    {req.method === 'bank' && <p className="text-[10px] text-muted-foreground">{req.bank_name} - ****{req.bank_account_number?.slice(-4)}</p>}
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table Layout */}
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden hidden md:block">
              <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-accent/40 text-left">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Method</th>
                    <th className="p-4 text-xs font-semibold text-muted-foreground uppercase text-right">Amount</th>
                    <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {isLoading ? (
                    <tr><td colSpan={4} className="p-6 text-center"><Skeleton className="h-8 w-full" /></td></tr>
                  ) : data?.history.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No withdrawals requested yet.</td></tr>
                  ) : (
                    data?.history.map((req: any) => (
                      <tr key={req.id} className="hover:bg-accent/10 transition-colors">
                        <td className="p-4 text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString()}
                          <span className="block text-[10px]">{new Date(req.created_at).toLocaleTimeString()}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {req.method === 'bank' ? <Landmark className="h-4 w-4 text-primary" /> : <Building2 className="h-4 w-4 text-primary" />}
                            <span className="capitalize font-semibold">{req.method}</span>
                          </div>
                          {req.method === 'crypto' && <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">{req.crypto_address?.slice(0,12)}...</span>}
                          {req.method === 'bank' && <span className="block text-[10px] text-muted-foreground mt-0.5">{req.bank_name} - {req.bank_account_number?.slice(-4)}</span>}
                        </td>
                        <td className="p-4 text-right font-serif font-bold text-foreground">
                          {formatMoney(Number(req.amount), req.currency)}
                        </td>
                        <td className="p-4">
                          {req.status === 'pending' && <Badge variant="outline" className="text-amber-600 border-amber-600/30 bg-amber-50"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>}
                          {req.status === 'approved' && <Badge variant="outline" className="text-blue-600 border-blue-600/30 bg-blue-50">Approved</Badge>}
                          {req.status === 'processing' && <Badge variant="outline" className="text-blue-600 border-blue-600/30 bg-blue-50">Processing</Badge>}
                          {req.status === 'completed' && <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Completed</Badge>}
                          {req.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                          {req.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

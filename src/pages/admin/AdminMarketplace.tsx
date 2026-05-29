import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/invest";
import { format } from "date-fns";
import { Tag, ArrowLeftRight, TrendingUp, Users, Layers, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ViewTab = "listings" | "transactions";

export function AdminMarketplace() {
  const [view, setView] = useState<ViewTab>("listings");
  const [search, setSearch] = useState("");

  // Fetch all listings
  const { data: listings = [], isLoading: loadingListings } = useQuery({
    queryKey: ["admin-marketplace-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secondary_market_listings" as any)
        .select(`
          *,
          investment_properties!secondary_market_listings_property_id_fkey(title, currency, cover_image_url)
        `)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Admin listings fetch error:", error);
        return [];
      }
      return (data || []) as any[];
    },
  });

  // Fetch all transactions
  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ["admin-marketplace-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secondary_market_transactions" as any)
        .select(`
          *,
          secondary_market_listings!secondary_market_transactions_listing_id_fkey(
            property_id,
            investment_properties!secondary_market_listings_property_id_fkey(title, currency)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Admin transactions fetch error:", error);
        return [];
      }
      return (data || []) as any[];
    },
  });

  // Stats
  const activeListings = listings.filter((l: any) => l.status === "active");
  const soldListings = listings.filter((l: any) => l.status === "sold");
  const totalVolume = transactions.reduce(
    (s: number, t: any) => s + Number(t.units_traded) * Number(t.price_per_unit),
    0
  );
  const uniqueSellers = new Set(listings.map((l: any) => l.seller_id)).size;
  const uniqueBuyers = new Set(transactions.map((t: any) => t.buyer_id)).size;

  // Filtered data
  const filteredListings = listings.filter((l: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const title = l.investment_properties?.title?.toLowerCase() ?? "";
    return title.includes(q) || l.status.includes(q);
  });

  const filteredTransactions = transactions.filter((t: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const title =
      t.secondary_market_listings?.investment_properties?.title?.toLowerCase() ?? "";
    return title.includes(q) || t.payment_method.includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold">Secondary Marketplace</h2>
        <p className="text-sm text-muted-foreground">
          Monitor peer-to-peer unit trading activity across all investment properties.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Tag}
          label="Active Listings"
          value={activeListings.length.toString()}
          accent="text-primary"
          bgAccent="bg-primary/10"
        />
        <StatCard
          icon={ArrowLeftRight}
          label="Completed Trades"
          value={soldListings.length.toString()}
          accent="text-primary"
          bgAccent="bg-primary/100/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Volume"
          value={formatMoney(totalVolume)}
          accent="text-amber-600"
          bgAccent="bg-amber-500/10"
        />
        <StatCard
          icon={Users}
          label="Active Traders"
          value={`${uniqueSellers} sellers · ${uniqueBuyers} buyers`}
          accent="text-blue-600"
          bgAccent="bg-blue-500/10"
        />
      </div>

      {/* View Toggle + Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex bg-accent/50 p-1 rounded-xl gap-1">
          <button
            onClick={() => setView("listings")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              view === "listings"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Tag className="h-3.5 w-3.5 inline mr-1.5" />
            Listings ({listings.length})
          </button>
          <button
            onClick={() => setView("transactions")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              view === "transactions"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowLeftRight className="h-3.5 w-3.5 inline mr-1.5" />
            Transactions ({transactions.length})
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by property name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl border-border bg-accent/50"
          />
        </div>
      </div>

      {/* Listings Table */}
      {view === "listings" && (
        <div className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-soft">
          {loadingListings ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No listings found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="w-full overflow-x-auto pb-2">
        <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-accent/50 border-b border-border/40">
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Property</th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Units</th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Price/Unit</th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Listed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredListings.map((l: any) => {
                    const currency = l.investment_properties?.currency ?? "USD";
                    const total = l.units_to_sell * Number(l.price_per_unit);
                    return (
                      <tr key={l.id} className="hover:bg-secondary/10 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg overflow-hidden bg-muted shrink-0">
                              <img
                                src={l.investment_properties?.cover_image_url || "/placeholder.svg"}
                                className="h-full w-full object-cover"
                                alt=""
                              />
                            </div>
                            <span className="font-semibold text-foreground line-clamp-1">
                              {l.investment_properties?.title ?? "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium">{l.units_to_sell}</td>
                        <td className="px-5 py-4 font-medium">{formatMoney(Number(l.price_per_unit), currency)}</td>
                        <td className="px-5 py-4 font-bold">{formatMoney(total, currency)}</td>
                        <td className="px-5 py-4">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-bold capitalize border",
                              l.status === "active" && "bg-primary/100/10 text-primary border-primary/20",
                              l.status === "sold" && "bg-primary text-primary-foreground border-none shadow-sm",
                              l.status === "cancelled" && "bg-secondary/50 text-muted-foreground border-border/50"
                            )}
                          >
                            {l.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground text-xs">
                          {format(new Date(l.created_at), "MMM dd, yyyy")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
      </div>
            </div>
          )}
        </div>
      )}

      {/* Transactions Table */}
      {view === "transactions" && (
        <div className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-soft">
          {loadingTransactions ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowLeftRight className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="w-full overflow-x-auto pb-2">
        <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-accent/50 border-b border-border/40">
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Property</th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Units</th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Price/Unit</th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Value</th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Method</th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredTransactions.map((t: any) => {
                    const currency =
                      t.secondary_market_listings?.investment_properties?.currency ?? "USD";
                    const total = Number(t.units_traded) * Number(t.price_per_unit);
                    const title =
                      t.secondary_market_listings?.investment_properties?.title ?? "Unknown";
                    return (
                      <tr key={t.id} className="hover:bg-secondary/10 transition-colors">
                        <td className="px-5 py-4 font-semibold text-foreground line-clamp-1">{title}</td>
                        <td className="px-5 py-4 font-medium">{t.units_traded}</td>
                        <td className="px-5 py-4 font-medium">{formatMoney(Number(t.price_per_unit), currency)}</td>
                        <td className="px-5 py-4 font-bold text-primary">{formatMoney(total, currency)}</td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className="text-[10px] font-bold capitalize rounded-md px-2 py-0.5">
                            {t.payment_method?.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground text-xs">
                          {format(new Date(t.created_at), "MMM dd, yyyy · HH:mm")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
      </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  bgAccent,
}: {
  icon: any;
  label: string;
  value: string;
  accent: string;
  bgAccent: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-9 w-9 rounded-lg ${bgAccent} flex items-center justify-center`}>
          <Icon className={`h-4.5 w-4.5 ${accent}`} />
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="font-serif text-xl font-bold">{value}</p>
    </div>
  );
}

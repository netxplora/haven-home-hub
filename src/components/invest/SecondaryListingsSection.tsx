import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/invest";
import { useAuth } from "@/hooks/useAuth";
import { Users, Tag, Layers, Wallet, ArrowRight } from "lucide-react";
import { BuyListingDialog } from "@/components/invest/BuyListingDialog";

interface SecondaryListingsSectionProps {
  propertyId: string;
  propertyTitle: string;
  currency: string;
}

export function SecondaryListingsSection({ propertyId, propertyTitle, currency }: SecondaryListingsSectionProps) {
  const { user } = useAuth();
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["secondary-listings", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secondary_market_listings" as any)
        .select("*")
        .eq("property_id", propertyId)
        .eq("status", "active")
        .order("price_per_unit", { ascending: true });

      if (error) {
        console.error("Error fetching secondary listings:", error);
        return [];
      }
      return (data || []) as any[];
    },
  });

  // Fetch wallet balance for the current user
  const { data: walletBalance = 0 } = useQuery({
    queryKey: ["wallet-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("user_available_balance");
      if (error) {
        console.error("Error fetching balance:", error);
        return 0;
      }
      return Number(data ?? 0);
    },
  });

  // Filter out listings by current user (they can't buy their own)
  const availableListings = listings.filter((l: any) => l.seller_id !== user?.id);
  const myListings = listings.filter((l: any) => l.seller_id === user?.id);

  if (isLoading) {
    return (
      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-soft space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (listings.length === 0) return null;

  function handleBuy(listing: any) {
    setSelectedListing(listing);
    setBuyDialogOpen(true);
  }

  return (
    <>
      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2 mb-5">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-xl font-semibold">Secondary Market Listings</h2>
          <Badge variant="outline" className="ml-auto text-[10px] font-bold border-primary/30 text-primary bg-primary/5 rounded-md px-2 py-0.5">
            {availableListings.length} Available
          </Badge>
        </div>

        {availableListings.length === 0 && myListings.length > 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">All active listings for this property are yours.</p>
          </div>
        )}

        {availableListings.length > 0 && (
          <div className="space-y-3">
            {availableListings.map((listing: any) => {
              const total = listing.units_to_sell * Number(listing.price_per_unit);
              return (
                <div
                  key={listing.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-accent/20 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{listing.units_to_sell} unit{listing.units_to_sell > 1 ? "s" : ""}</span>
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Tag className="h-3 w-3" /> {formatMoney(Number(listing.price_per_unit), currency)}/unit
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Listed {new Date(listing.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total</p>
                      <p className="font-serif font-bold text-primary">{formatMoney(total, currency)}</p>
                    </div>
                    {user ? (
                      <Button
                        size="sm"
                        className="rounded-xl h-10 px-5 font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all hover:scale-105 active:scale-95"
                        onClick={() => handleBuy(listing)}
                      >
                        Buy <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="rounded-xl h-10 px-5 font-bold" asChild>
                        <a href="/auth">Sign in to Buy</a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {myListings.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">Your active listings</p>
            {myListings.map((listing: any) => (
              <div
                key={listing.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-secondary/10 text-sm"
              >
                <span className="text-muted-foreground">
                  {listing.units_to_sell} unit{listing.units_to_sell > 1 ? "s" : ""} at {formatMoney(Number(listing.price_per_unit), currency)}/unit
                </span>
                <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 text-amber-600 bg-amber-500/5">
                  Your Listing
                </Badge>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-[10px] text-muted-foreground flex items-start gap-1.5">
          <Wallet className="h-3 w-3 shrink-0 mt-0.5" />
          Secondary market purchases are settled instantly using your wallet balance. Units and certificates transfer immediately.
        </p>
      </div>

      <BuyListingDialog
        open={buyDialogOpen}
        onOpenChange={setBuyDialogOpen}
        listing={selectedListing}
        propertyTitle={propertyTitle}
        currency={currency}
        walletBalance={walletBalance}
      />
    </>
  );
}

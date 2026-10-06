import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SEO } from "@/components/site/SEO";
import { useSecondaryMarket } from "@/hooks/useSecondaryMarket";
import { useAuth } from "@/hooks/useAuth";
import { useBrand } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/invest";
import { MapPin, TrendingUp, Search, RefreshCw, ShoppingCart, Info, Activity, Layers } from "lucide-react";
import { resolveImage } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import investHero4 from "@/assets/invest-hero4.jpg";
import { LazyImage } from "@/components/ui/LazyImage";

export default function SecondaryMarket() {
  const { brand } = useBrand();
  const { listings, isLoadingListings, purchaseListing, isPurchasing } = useSecondaryMarket();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [purchaseModal, setPurchaseModal] = useState<any>(null);
  const [unitsToBuy, setUnitsToBuy] = useState<number>(1);

  const filteredListings = listings.filter((l) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      l.property?.title?.toLowerCase().includes(query) ||
      l.property?.location?.toLowerCase().includes(query)
    );
  });

  const openPurchaseModal = (listing: any) => {
    setPurchaseModal(listing);
    setUnitsToBuy(1);
  };

  const handlePurchase = async () => {
    if (!purchaseModal) return;
    try {
      await purchaseListing({ listingId: purchaseModal.id, unitsToBuy });
      setPurchaseModal(null);
    } catch (e) {
      // Error handled by hook toast
    }
  };

  return (
    <SiteLayout transparentNav="mobile">
      <SEO 
        title={`Secondary Share Exchange | ${brand.platform_name}`} 
        description={`Buy and sell fractional real estate shares directly with verified investors on the ${brand.platform_name} Secondary Market.`} 
      />
      
      {/* Hero */}
      <section className="relative bg-secondary/10 overflow-hidden border-b border-border/40 pt-28 pb-16 lg:py-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.03),transparent_60%)]" />
        </div>

        <div className="container-wide relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold uppercase tracking-wider mb-5">
                <Activity className="h-3.5 w-3.5 animate-pulse" /> Peer-to-Peer Share Exchange
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                Secondary Market Liquidity for Real Estate Shares
              </h1>

              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed font-sans">
                Buy and sell fractional real estate shares directly with verified investors. Gain immediate exposure to seasoned properties with ongoing dividend distributions.
              </p>

              <div className="mt-8 w-full max-w-lg">
                <div className="relative flex items-center bg-background border border-border/80 rounded-xl p-1.5 backdrop-blur-md shadow-sm focus-within:border-primary/50 transition-colors">
                  <Search className="absolute left-4 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search properties or cities..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-transparent border-0 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 text-sm font-sans"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Admin-Verified Listings
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Wallet Settlement
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Partial Purchase Supported
                </span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden border border-border/80 shadow-lg bg-card group">
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <img
                    src={investHero4}
                    alt="Secondary Real Estate Assets"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="eager"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 inset-x-0 p-5 flex items-center justify-between text-white">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-primary font-semibold">Active Exchange</p>
                    <p className="text-sm font-medium text-white/90 mt-0.5">Verified Institutional Grade Units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">Available Listings</p>
                    <p className="text-sm font-semibold text-white">{listings.length} Active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-wide py-12 pb-24">
        {isLoadingListings ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-primary/50" />
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-2xl border border-dashed border-border/60">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold text-foreground">No active listings</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              There are currently no approved shares available on the secondary market. Check back later or invest in new primary offerings.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredListings.map((listing) => {
              const unitsAvailable = listing.units_available ?? (listing.units_to_sell - (listing.units_sold ?? 0));
              const totalAskingPrice = unitsAvailable * listing.price_per_unit;
              const isOwnListing = user?.id === listing.seller_id;
              
              const originalPrice = listing.property?.unit_price || 0;
              const diff = listing.price_per_unit - originalPrice;
              const diffPercentage = originalPrice > 0 ? (diff / originalPrice) * 100 : 0;
              
              return (
                <div key={listing.id} className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {listing.property?.cover_image_url ? (
                      <LazyImage 
                        src={resolveImage(listing.property.cover_image_url)} 
                        alt={listing.property?.title}
                        aspectClass="aspect-[4/3]"
                        wrapperClassName="w-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Layers className="h-8 w-8 opacity-20" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                      <Badge className="bg-background/80 text-foreground backdrop-blur-md font-semibold border-none shadow-sm">
                        {unitsAvailable} of {listing.units_to_sell} Units
                      </Badge>
                    </div>
                    {listing.units_sold > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                        <div
                          className="h-full bg-primary/70"
                          style={{ width: `${(listing.units_sold / listing.units_to_sell) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg leading-tight line-clamp-1 mb-1">
                        {listing.property?.title}
                      </h3>
                      <div className="flex items-center text-xs text-muted-foreground mb-4">
                        <MapPin className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate">{listing.property?.location}</span>
                      </div>
                      
                      <div className="space-y-3 p-3 bg-muted/50 rounded-xl mb-5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Price / Share</span>
                          <span className="font-bold text-foreground">
                            {formatMoney(listing.price_per_unit, listing.property?.currency)}
                          </span>
                        </div>
                        
                        {diffPercentage !== 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground flex items-center">
                              <Info className="h-3 w-3 mr-1" /> vs Original
                            </span>
                            <span className={`font-semibold ${diffPercentage > 0 ? "text-red-500" : "text-green-500"}`}>
                              {diffPercentage > 0 ? "+" : ""}{diffPercentage.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        
                        <div className="pt-2 border-t border-border/50 flex justify-between items-center">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Value</span>
                          <span className="font-bold text-primary text-lg">
                            {formatMoney(totalAskingPrice, listing.property?.currency)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground flex items-center justify-between mb-2">
                        <span>Seller: {listing.seller?.full_name || "Anonymous"}</span>
                        <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 mt-auto">
                      {isOwnListing ? (
                        <Button variant="secondary" className="w-full cursor-default" disabled>
                          Your Listing
                        </Button>
                      ) : (
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
                          onClick={() => openPurchaseModal(listing)}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" /> Buy Shares
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Buy Shares Modal ── */}
      <Dialog open={!!purchaseModal} onOpenChange={(open) => !open && setPurchaseModal(null)}>
        <DialogContent className="p-0 gap-0 border-0 bg-transparent shadow-none max-w-none w-auto">
          {purchaseModal && (() => {
            const listing = purchaseModal;
            const unitsAvailable = listing.units_available ?? (listing.units_to_sell - (listing.units_sold ?? 0));
            const totalCost = unitsToBuy * listing.price_per_unit;
            const currency = listing.property?.currency;
            const originalPrice = listing.property?.unit_price || 0;
            const diff = listing.price_per_unit - originalPrice;
            const diffPct = originalPrice > 0 ? (diff / originalPrice) * 100 : 0;

            return (
              <>
                {/* Accessibility */}
                <DialogTitle className="sr-only">Buy Shares</DialogTitle>
                <DialogDescription className="sr-only">
                  Select the number of units to purchase. Payment will be deducted from your wallet balance.
                </DialogDescription>

                {/* Sheet panel — bottom on mobile, centred card on sm+ */}
                <div className="
                  fixed inset-x-0 bottom-0 z-50
                  sm:relative sm:inset-auto sm:mx-auto sm:w-full sm:max-w-md
                  flex flex-col
                  bg-background
                  rounded-t-2xl sm:rounded-2xl
                  border-t border-border/60 sm:border sm:border-border
                  shadow-2xl
                  max-h-[92dvh] sm:max-h-[90vh]
                  overflow-hidden
                ">
                  {/* Drag handle — mobile only */}
                  <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                    <div className="h-1 w-10 rounded-full bg-border/70" />
                  </div>

                  {/* Property image header — eager, no LazyImage */}
                  <div className="relative h-36 sm:h-44 shrink-0 bg-muted overflow-hidden">
                    {listing.property?.cover_image_url ? (
                      <img
                        src={resolveImage(listing.property.cover_image_url)}
                        alt={listing.property?.title ?? "Property"}
                        loading="eager"
                        decoding="sync"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Layers className="h-10 w-10 text-muted-foreground/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-0.5">
                        Secondary Market Purchase
                      </p>
                      <h2 className="font-bold text-base sm:text-lg text-white leading-tight line-clamp-2">
                        {listing.property?.title}
                      </h2>
                      <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{listing.property?.location}</span>
                      </p>
                    </div>
                  </div>

                  {/* Scrollable body */}
                  <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-5">

                    {/* Listing summary rows */}
                    <div className="rounded-xl border border-border/50 bg-muted/30 divide-y divide-border/40 text-sm">
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-muted-foreground">Available Units</span>
                        <span className="font-bold text-foreground">{unitsAvailable} units</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-muted-foreground">Price per Share</span>
                        <div className="text-right">
                          <span className="font-bold text-foreground block">{formatMoney(listing.price_per_unit, currency)}</span>
                          {diffPct !== 0 && (
                            <span className={`text-[11px] font-semibold ${diffPct > 0 ? "text-red-500" : "text-emerald-600"}`}>
                              {diffPct > 0 ? "+" : ""}{diffPct.toFixed(1)}% vs original
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-muted-foreground">Seller</span>
                        <span className="font-medium text-foreground">{listing.seller?.full_name || "Verified Investor"}</span>
                      </div>
                    </div>

                    {/* Units stepper */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground">Units to Buy</Label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={unitsToBuy <= 1}
                          onClick={() => setUnitsToBuy(Math.max(1, unitsToBuy - 1))}
                          className="h-12 w-12 rounded-xl border border-border bg-background text-xl font-bold flex items-center justify-center shrink-0 transition-colors hover:bg-muted active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation select-none"
                        >
                          −
                        </button>
                        <Input
                          type="number"
                          min={1}
                          max={unitsAvailable}
                          value={unitsToBuy}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (isNaN(v)) setUnitsToBuy(1);
                            else setUnitsToBuy(Math.min(unitsAvailable, Math.max(1, v)));
                          }}
                          className="h-12 flex-1 rounded-xl text-center text-lg font-bold border-border bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          disabled={unitsToBuy >= unitsAvailable}
                          onClick={() => setUnitsToBuy(Math.min(unitsAvailable, unitsToBuy + 1))}
                          className="h-12 w-12 rounded-xl border border-border bg-background text-xl font-bold flex items-center justify-center shrink-0 transition-colors hover:bg-muted active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation select-none"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <button
                          type="button"
                          className="font-semibold text-primary underline-offset-2 hover:underline"
                          onClick={() => setUnitsToBuy(unitsAvailable)}
                        >
                          Buy all {unitsAvailable} units
                        </button>
                        <span>Max: {unitsAvailable}</span>
                      </div>
                    </div>

                    {/* Total cost */}
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Cost</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {unitsToBuy} unit{unitsToBuy > 1 ? "s" : ""} × {formatMoney(listing.price_per_unit, currency)}
                        </p>
                      </div>
                      <p className="font-bold text-2xl text-primary">{formatMoney(totalCost, currency)}</p>
                    </div>

                    {/* Disclaimer */}
                    <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-400 p-3.5 rounded-xl text-xs leading-relaxed">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>This transaction is final. Funds will be immediately deducted from your wallet and shares transferred to your investment portfolio.</p>
                    </div>
                  </div>

                  {/* Sticky footer */}
                  <div className="shrink-0 px-5 pb-6 pt-4 border-t border-border/50 bg-background flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto sm:flex-none h-12 sm:h-10 rounded-xl font-semibold text-sm"
                      onClick={() => setPurchaseModal(null)}
                      disabled={isPurchasing}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="w-full sm:flex-1 h-12 sm:h-10 rounded-xl font-bold text-sm shadow-sm"
                      onClick={handlePurchase}
                      disabled={isPurchasing || !user}
                    >
                      {isPurchasing
                        ? "Processing..."
                        : !user
                        ? "Login Required"
                        : `Confirm Purchase · ${formatMoney(totalCost, currency)}`}
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}


import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SEO } from "@/components/site/SEO";
import { useSecondaryMarket } from "@/hooks/useSecondaryMarket";
import { useAuth } from "@/hooks/useAuth";
import { useBrand } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/invest";
import { MapPin, TrendingUp, Search, RefreshCw, ShoppingCart, Info, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatPrice, resolveImage } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import investHero4 from "@/assets/invest-hero4.jpg";
import { LazyImage } from "@/components/ui/LazyImage";

export default function SecondaryMarket() {
  const { brand } = useBrand();
  const { listings, isLoadingListings, purchaseListing, isPurchasing } = useSecondaryMarket();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [purchaseModal, setPurchaseModal] = useState<any>(null);

  const filteredListings = listings.filter((l) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      l.property?.title?.toLowerCase().includes(query) ||
      l.property?.location?.toLowerCase().includes(query)
    );
  });

  const handlePurchase = async () => {
    if (!purchaseModal) return;
    try {
      await purchaseListing(purchaseModal.id);
      setPurchaseModal(null);
    } catch (e) {
      // Error is handled in the hook via toast
    }
  };

  return (
    <SiteLayout transparentNav="mobile">
      <SEO 
        title={`Secondary Share Exchange | ${brand.platform_name}`} 
        description={`Trade verified property shares with other investors on the ${brand.platform_name} Secondary Market.`} 
      />
      
      {/* Hero Type C: Split Visual Asset Exchange */}
      <section className="relative bg-secondary/10 overflow-hidden border-b border-border/40 pt-28 pb-16 lg:py-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.03),transparent_60%)]" />
        </div>

        <div className="container-wide relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Context, Pitch, and Real-time Search */}
            <div className="lg:col-span-7 flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-5">
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
                    placeholder="Search properties, cities, or asset classes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-transparent border-0 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 text-sm font-sans"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Automated Escrow Settlement
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Title Registry Verification
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Immediate Yield Entitlement
                </span>
              </div>
            </div>

            {/* Right Column: Architectural Asset Card */}
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
                    <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">Active Exchange</p>
                    <p className="text-sm font-medium text-white/90 mt-0.5">Verified Institutional Grade Units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">Trading Window</p>
                    <p className="text-sm font-semibold text-white">24/7 Liquidity</p>
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
              There are currently no shares available on the secondary market. Check back later or invest in new primary offerings.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredListings.map((listing) => {
              const totalAskingPrice = listing.units_to_sell * listing.price_per_unit;
              const isOwnListing = user?.id === listing.seller_id;
              
              // Calculate premium/discount against original price
              const originalPrice = listing.property?.unit_price || 0;
              const diff = listing.price_per_unit - originalPrice;
              const diffPercentage = originalPrice > 0 ? (diff / originalPrice) * 100 : 0;
              
              return (
                <div key={listing.id} className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {(listing.property as any)?.cover_image_url ? (
                      <LazyImage 
                        src={resolveImage((listing.property as any).cover_image_url)} 
                        alt={listing.property?.title}
                        aspectClass="aspect-[4/3]"
                        wrapperClassName="w-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                      <Badge className="bg-background/80 text-foreground backdrop-blur-md font-semibold border-none shadow-sm">
                        {listing.units_to_sell} Shares
                      </Badge>
                    </div>
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
                          <span className="text-muted-foreground">Asking Price / Share</span>
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
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Cost</span>
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
                          onClick={() => setPurchaseModal(listing)}
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

      {/* Purchase Confirmation Modal */}
      <Dialog open={!!purchaseModal} onOpenChange={(open) => !open && setPurchaseModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase shares from the secondary market using your available wallet balance.
            </DialogDescription>
          </DialogHeader>
          
          {purchaseModal && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Property</span>
                  <span className="font-medium text-right max-w-[200px] truncate">{purchaseModal.property?.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shares</span>
                  <span className="font-bold">{purchaseModal.units_to_sell}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per share</span>
                  <span className="font-medium">{formatMoney(purchaseModal.price_per_unit, purchaseModal.property?.currency)}</span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <span className="font-medium">Total Cost</span>
                  <span className="font-bold text-primary text-xl">
                    {formatMoney(purchaseModal.units_to_sell * purchaseModal.price_per_unit, purchaseModal.property?.currency)}
                  </span>
                </div>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 p-3 rounded-lg text-xs flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>This transaction is final and non-refundable. Funds will be immediately deducted from your wallet and transferred to the seller.</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPurchaseModal(null)} disabled={isPurchasing}>
              Cancel
            </Button>
            <Button onClick={handlePurchase} disabled={isPurchasing || !user}>
              {isPurchasing ? "Processing Trade..." : !user ? "Login Required" : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}

"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Sparkles, 
  TrendingDown, 
  MapPin, 
  ShieldCheck, 
  Store as StoreIcon, 
  Clock, 
  ArrowRight,
  Flame,
  CheckCircle2,
  PackageX,
  Truck,
  Building2,
  Star,
  Bike
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { HeroBanner } from "@/components/HeroBanner";
import { CategoryTiles } from "@/components/CategoryTiles";
import { StoreFilterBar, SortField, SortDirection } from "@/components/StoreFilterBar";
import { ProductCard } from "@/components/ProductCard";
import { DriftPricingModal } from "@/components/DriftPricingModal";
import { StoreReviewsModal } from "@/components/StoreReviewsModal";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Footer } from "@/components/Footer";

import { useProducts, useStores } from "@/components/CatalogProvider";
import { Product, CartSummary, Store } from "@/lib/types";
import { getCart } from "@/lib/actions";
import { formatNaira } from "@/lib/pricing";

export default function HomePage() {
  const products = useProducts();
  const stores = useStores();

  const [cartSummary, setCartSummary] = useState<CartSummary>({
    items: [],
    itemCount: 0,
    subtotal: 0,
    originalSubtotal: 0,
    savingsTotal: 0,
    platformFee: 0,
    total: 0,
    storesInvolved: [],
  });

  // Filter & Sort States
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("discount");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Modals & Drawers
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [activeDriftProduct, setActiveDriftProduct] = useState<Product | null>(null);
  const [reviewModalStore, setReviewModalStore] = useState<Store | null>(null);

  // Fetch cart on mount & on updates
  const refreshCart = async () => {
    try {
      const updated = await getCart();
      setCartSummary(updated);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  // Filter & Sort Pipeline
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        if (selectedStoreId !== "all" && product.storeId !== selectedStoreId) return false;
        if (selectedCategoryId !== "all" && product.category !== selectedCategoryId) return false;
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === "price") {
          diff = a.currentPrice - b.currentPrice;
        } else if (sortField === "upload_time") {
          diff = new Date(a.listedAt).getTime() - new Date(b.listedAt).getTime();
        } else if (sortField === "expiry_time") {
          diff = a.daysRemaining - b.daysRemaining;
        } else if (sortField === "discount") {
          diff = a.discountPercent - b.discountPercent;
        }

        return sortDirection === "asc" ? diff : -diff;
      });
  }, [products, selectedStoreId, selectedCategoryId, sortField, sortDirection]);

  const handleResetFilters = () => {
    setSelectedStoreId("all");
    setSelectedCategoryId("all");
    setSortField("discount");
    setSortDirection("desc");
  };

  const handleToggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const scrollToDeals = () => {
    const el = document.getElementById("deals-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-emerald-500 selection:text-white">
      
      {/* Navigation Header */}
      <Navbar
        cartItemCount={cartSummary.itemCount}
        cartSubtotal={cartSummary.subtotal}
        onOpenCart={() => setCartDrawerOpen(true)}
        selectedStoreId={selectedStoreId}
        onSelectStore={(sId) => setSelectedStoreId(sId)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-8">
        
        {/* Hero Section */}
        <HeroBanner onExploreDeals={scrollToDeals} />

        {/* Multi-Store Fulfillment Hubs Consolidation Banner */}
        <section id="hub-fulfillment" className="bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white border border-emerald-700/40 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black uppercase">
                <Truck className="w-3.5 h-3.5" />
                <span>Multi-Store Consolidation</span>
              </div>
              
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Ordering from multiple stores? We consolidate your bag.
              </h2>
              
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium leading-relaxed">
                If your cart contains items from multiple supermarkets, our fleet runs <strong>two daily consolidation batches</strong> to bring everything to your selected central pickup hub or dispatch location. No need to visit multiple stores.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
                <p className="text-amber-300 font-black text-sm">Batch 1: 12:00 PM</p>
                <p className="text-[11px] text-emerald-100/80 mt-0.5">Morning multi-store orders ready for afternoon pickup.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
                <p className="text-emerald-300 font-black text-sm">Batch 2: 5:00 PM</p>
                <p className="text-[11px] text-emerald-100/80 mt-0.5">Afternoon multi-store orders ready for evening collection.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Category Navigation Tiles without icons */}
        <CategoryTiles
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(cId) => setSelectedCategoryId(cId)}
        />

        {/* Filter & Simplified Sort Bar */}
        <div id="deals-section" className="pt-2">
          <StoreFilterBar
            selectedStoreId={selectedStoreId}
            onSelectStore={(sId) => setSelectedStoreId(sId)}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(cId) => setSelectedCategoryId(cId)}
            sortField={sortField}
            onSortFieldChange={(f) => setSortField(f)}
            sortDirection={sortDirection}
            onToggleSortDirection={handleToggleSortDirection}
            totalResultsCount={filteredProducts.length}
            onResetFilters={handleResetFilters}
          />
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center my-8 shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <PackageX className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No rescue groceries match your selected filters
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Try switching supermarkets or viewing all categories to see available short-dated deals.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-700/20"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenDriftModal={(prod) => setActiveDriftProduct(prod)}
                onProductAddedToCart={refreshCart}
              />
            ))}
          </div>
        )}

        {/* Dynamic 2.5% Drift Pricing Explainer Banner */}
        <section id="drift-pricing" className="mt-14 mb-8 bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-xl border border-emerald-800/30">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black uppercase">
              <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
              <span>Algorithmic Food Clearance</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Why do Stillgood prices drop 2.5% every single week?
            </h2>

            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed font-medium">
              Unlike normal supermarkets where short-dated goods sit at full price until they expire and end up in Nigerian landfills, our merchant inventory decays automatically every 7 days. This ensures fast customer adoption, cheaper grocery bills, and zero food waste.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-emerald-400 font-black text-sm">Step 1: Base Markdown</span>
                <p className="text-[11px] text-slate-300 mt-1">
                  Listed at initial 30%–50% off retail price.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-amber-300 font-black text-sm">Step 2: Weekly +2.5%</span>
                <p className="text-[11px] text-slate-300 mt-1">
                  Automated price drop every Monday.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-teal-300 font-black text-sm">Step 3: Escrow Pickup</span>
                <p className="text-[11px] text-slate-300 mt-1">
                  Order online, inspect & collect with your 4-digit PIN.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Partner Supermarkets Directory with Reviews modal triggers */}
        <section className="my-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Verified Supermarket Pickup Locations
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Order online and pick up at the store or send a dispatch rider with your SG-XXXXX code.
              </p>
            </div>
            <Link
              href="/stores"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View All 6 Hubs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <div
                key={store.id}
                className={`p-4 rounded-3xl border transition-all bg-white flex flex-col justify-between ${
                  selectedStoreId === store.id
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                    : "border-slate-200/90 hover:border-emerald-300 hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-start gap-3">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-slate-200">
                      <Image
                        src={store.image}
                        alt={store.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {store.area}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewModalStore(store);
                          }}
                          className="text-xs font-bold text-slate-700 flex items-center gap-1 hover:text-emerald-800 hover:underline cursor-pointer"
                          title="Read customer & rider reviews"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{store.rating} ({store.reviewCount})</span>
                        </button>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 mt-1 truncate">
                        {store.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {store.address}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-600 font-medium">
                    <span className="font-bold text-slate-900">Pickup:</span> {store.pickupInstructions}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {store.totalDeals} active surplus deals
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedStoreId(selectedStoreId === store.id ? "all" : store.id)}
                    className="font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer text-xs"
                  >
                    {selectedStoreId === store.id ? "Showing Deals ✓" : "Filter By Store"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cartSummary={cartSummary}
        onProceedToCheckout={() => setCheckoutModalOpen(true)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        cartSummary={cartSummary}
        onOrderCreated={() => {
          refreshCart();
        }}
      />

      {/* 2.5% Drift Pricing Timeline Modal */}
      <DriftPricingModal
        product={activeDriftProduct}
        isOpen={!!activeDriftProduct}
        onClose={() => setActiveDriftProduct(null)}
      />

      {/* Store Reviews Modal */}
      <StoreReviewsModal
        store={reviewModalStore}
        isOpen={!!reviewModalStore}
        onClose={() => setReviewModalStore(null)}
      />

      {/* Footer */}
      <Footer />

    </div>
  );
}

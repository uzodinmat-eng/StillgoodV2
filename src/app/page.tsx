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
  PackageX
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { HeroBanner } from "@/components/HeroBanner";
import { CategoryTiles } from "@/components/CategoryTiles";
import { StoreFilterBar, SortOption } from "@/components/StoreFilterBar";
import { ProductCard } from "@/components/ProductCard";
import { DriftPricingModal } from "@/components/DriftPricingModal";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Footer } from "@/components/Footer";

import { getProducts, STORES, CATEGORIES } from "@/lib/data";
import { Product, CartSummary, Store } from "@/lib/types";
import { getCart } from "@/lib/actions";
import { formatNaira } from "@/lib/pricing";

export default function HomePage() {
  const [products] = useState<Product[]>(getProducts());
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

  // Filter States
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("discount_desc");
  const [storageFilter, setStorageFilter] = useState<string>("all");

  // Modals & Drawers
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [activeDriftProduct, setActiveDriftProduct] = useState<Product | null>(null);

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
        if (storageFilter !== "all" && product.storageCondition !== storageFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "discount_desc") return b.discountPercent - a.discountPercent;
        if (sortBy === "days_left_asc") return a.daysRemaining - b.daysRemaining;
        if (sortBy === "price_asc") return a.currentPrice - b.currentPrice;
        if (sortBy === "price_desc") return b.currentPrice - a.currentPrice;
        if (sortBy === "newest") return new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime();
        return 0;
      });
  }, [products, selectedStoreId, selectedCategoryId, storageFilter, sortBy]);

  const handleResetFilters = () => {
    setSelectedStoreId("all");
    setSelectedCategoryId("all");
    setSortBy("discount_desc");
    setStorageFilter("all");
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        
        {/* Hero Section */}
        <HeroBanner onExploreDeals={scrollToDeals} />

        {/* Category Navigation Tiles */}
        <CategoryTiles
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(cId) => setSelectedCategoryId(cId)}
        />

        {/* Filter & Sort Bar */}
        <div id="deals-section" className="pt-2">
          <StoreFilterBar
            selectedStoreId={selectedStoreId}
            onSelectStore={(sId) => setSelectedStoreId(sId)}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(cId) => setSelectedCategoryId(cId)}
            sortBy={sortBy}
            onSortChange={(sort) => setSortBy(sort)}
            storageFilter={storageFilter}
            onStorageFilterChange={(storage) => setStorageFilter(storage)}
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
              Unlike normal supermarkets where short-dated goods sit at full price until they expire and end up in Abuja landfills, our merchant inventory decays automatically every 7 days. This ensures fast customer adoption, cheaper grocery bills, and zero food waste.
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

        {/* Abuja Supermarket Hubs Quick Directory */}
        <section className="my-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Verified Abuja Supermarket Pickup Hubs
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Collect your Stillgood rescue bins directly at customer care counters across Abuja.
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
            {STORES.map((store) => (
              <div
                key={store.id}
                onClick={() => setSelectedStoreId(store.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                  selectedStoreId === store.id
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                    : "border-slate-200/90 hover:border-emerald-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200">
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
                      <span className="text-xs font-bold text-slate-700">
                        ★ {store.rating}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 mt-1 truncate">
                      {store.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {store.address}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {store.totalDeals} active surplus deals
                  </span>
                  <span className="font-bold text-emerald-700">
                    {selectedStoreId === store.id ? "Selected Hub" : "Filter By Store"}
                  </span>
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

      {/* Footer */}
      <Footer />

    </div>
  );
}

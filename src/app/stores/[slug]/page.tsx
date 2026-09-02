"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { 
  Building2, 
  MapPin, 
  Star, 
  Clock, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles,
  TrendingDown
} from "lucide-react";
import { getStores, getProducts } from "@/lib/data";
import { ProductCard } from "@/components/ProductCard";
import { DriftPricingModal } from "@/components/DriftPricingModal";
import { StoreReviewsModal } from "@/components/StoreReviewsModal";
import { Product } from "@/lib/types";

export default function StoreDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const stores = getStores();
  const store = stores.find((s) => s.slug === slug || s.id === slug) || stores[0];

  const products = getProducts().filter((p) => p.storeId === store.id);
  const [activeDriftProduct, setActiveDriftProduct] = useState<Product | null>(null);
  const [reviewsOpen, setReviewsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white pb-12">
      
      {/* Store Banner Hero */}
      <div className="relative bg-slate-900 text-white overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 opacity-25">
          <Image
            src={store.bannerImage || store.image}
            alt={store.name}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-4">
          <Link
            href="/stores"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Partner Supermarkets</span>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black">
                <MapPin className="w-3.5 h-3.5" />
                <span>{store.area}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {store.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                {store.address}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shrink-0 text-xs space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-300">Customer Rating</span>
                <button
                  type="button"
                  onClick={() => setReviewsOpen(true)}
                  className="font-black text-amber-300 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-300" />
                  <span>{store.rating} ({store.reviewCount} reviews)</span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-300">Operating Hours</span>
                <span className="font-bold text-white">{store.openHours}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-300">Available Surplus</span>
                <span className="font-bold text-emerald-400">{products.length} rescue deals</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Pickup Instructions Info Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Pickup Instructions
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5 leading-relaxed">
              {store.pickupInstructions}
            </p>
          </div>
        </div>

        {/* Product Grid for Store */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Live Deals at {store.name}
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {products.length} verified products
            </span>
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <p className="text-sm font-bold text-slate-700">No deals currently listed for this store.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpenDriftModal={(p) => setActiveDriftProduct(p)}
                />
              ))}
            </div>
          )}
        </div>

      </main>

      <DriftPricingModal
        product={activeDriftProduct}
        isOpen={!!activeDriftProduct}
        onClose={() => setActiveDriftProduct(null)}
      />

      <StoreReviewsModal
        store={store}
        isOpen={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
      />

    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Building2, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Search,
  ArrowLeft
} from "lucide-react";
import { useStores } from "@/components/CatalogProvider";
import { Store } from "@/lib/types";
import { StoreReviewsModal } from "@/components/StoreReviewsModal";

export default function StoresDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState("all");
  const [reviewStore, setReviewStore] = useState<Store | null>(null);

  const stores = useStores();
  const areas = ["all", "Wuse II", "Central Area", "Jahi", "Jabi"];

  const filteredStores = stores.filter((store) => {
    const matchesArea = selectedArea === "all" || store.area === selectedArea;
    const matchesSearch =
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.area.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArea && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      
      {/* Top Header */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-emerald-900/50">
        <div className="max-w-7xl mx-auto space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Stillgood Marketplace</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black">
            <Building2 className="w-3.5 h-3.5" />
            <span>CERTIFIED PARTNER SUPERMARKETS</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Supermarket Pickup Locations
          </h1>
          <p className="text-sm sm:text-base text-emerald-200/80 max-w-2xl font-medium leading-relaxed">
            Order online and pick up at the store or send a dispatch rider. Present your order number SG-XXXXX and 4-digit PIN at the customer care desk.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Search & Area Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by store name, street, or area..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {areas.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setSelectedArea(area)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedArea === area
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {area === "all" ? "All Areas" : area}
              </button>
            ))}
          </div>

        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <div
              key={store.id}
              className="group bg-white rounded-3xl border border-slate-200 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-16/9 w-full bg-slate-100 overflow-hidden">
                  <Image
                    src={store.image}
                    alt={store.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-xl">
                    {store.area}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {store.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{store.address}</span>
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{store.openHours}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-[11px] text-emerald-950">
                    <strong>Pickup Instructions:</strong> {store.pickupInstructions}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <Link
                  href={`/stores/${store.slug}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
                >
                  <span>View {store.totalDeals} Surplus Deals</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>
          ))}
        </div>

      </main>

      {/* Reviews Modal */}
      <StoreReviewsModal
        store={reviewStore}
        isOpen={!!reviewStore}
        onClose={() => setReviewStore(null)}
      />

    </div>
  );
}

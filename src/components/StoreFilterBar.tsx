"use client";

import React from "react";
import { Filter, SlidersHorizontal, RotateCcw, Building2, Layers, ArrowDownUp } from "lucide-react";
import { STORES, CATEGORIES } from "@/lib/data";

export type SortOption = "discount_desc" | "price_asc" | "price_desc" | "days_left_asc" | "newest";

interface StoreFilterBarProps {
  selectedStoreId: string;
  onSelectStore: (storeId: string) => void;
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  storageFilter: string;
  onStorageFilterChange: (storage: string) => void;
  totalResultsCount: number;
  onResetFilters: () => void;
}

export function StoreFilterBar({
  selectedStoreId,
  onSelectStore,
  selectedCategoryId,
  onSelectCategory,
  sortBy,
  onSortChange,
  storageFilter,
  onStorageFilterChange,
  totalResultsCount,
  onResetFilters,
}: StoreFilterBarProps) {
  const isFiltered =
    selectedStoreId !== "all" ||
    selectedCategoryId !== "all" ||
    storageFilter !== "all" ||
    sortBy !== "discount_desc";

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs mb-6">
      
      {/* Top Header & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Filter Abuja Inventory
            </h3>
            <p className="text-[11px] font-semibold text-slate-500">
              Showing <span className="text-emerald-700 font-bold">{totalResultsCount} verified deals</span> ready for pickup
            </p>
          </div>
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Labeled Native Select Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-3.5">
        
        {/* Labeled Native Store Filter */}
        <div>
          <label
            htmlFor="store-filter-select"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Abuja Supermarket / Hub:</span>
          </label>
          <div className="relative">
            <select
              id="store-filter-select"
              value={selectedStoreId}
              onChange={(e) => onSelectStore(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer appearance-none pr-8"
            >
              <option value="all">📍 All Abuja Stores (6 Locations)</option>
              {STORES.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} — {store.area} ({store.totalDeals} deals)
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Labeled Native Category Filter */}
        <div>
          <label
            htmlFor="category-filter-select"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Grocery Category:</span>
          </label>
          <div className="relative">
            <select
              id="category-filter-select"
              value={selectedCategoryId}
              onChange={(e) => onSelectCategory(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer appearance-none pr-8"
            >
              <option value="all">🧺 All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.itemCount} items)
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Labeled Native Sort Filter */}
        <div>
          <label
            htmlFor="sort-filter-select"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5"
          >
            <ArrowDownUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sort Deals By:</span>
          </label>
          <div className="relative">
            <select
              id="sort-filter-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer appearance-none pr-8"
            >
              <option value="discount_desc">💥 Highest Markdown % (Biggest Discount)</option>
              <option value="days_left_asc">⏳ Expiring Soonest (Clearance Priority)</option>
              <option value="price_asc">💵 Lowest Price (₦ - ₦₦₦)</option>
              <option value="price_desc">🏷️ Highest Price First</option>
              <option value="newest">✨ Recently Listed</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

      </div>

      {/* Storage Condition Quick Pills */}
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100 overflow-x-auto">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Storage:
        </span>
        {[
          { id: "all", label: "All Items" },
          { id: "ambient", label: "📦 Ambient / Shelf" },
          { id: "chilled", label: "❄️ Chilled (4°C)" },
          { id: "frozen", label: "🧊 Deep Frozen (-18°C)" },
        ].map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => onStorageFilterChange(pill.id)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              storageFilter === pill.id
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

    </div>
  );
}

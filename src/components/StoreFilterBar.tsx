"use client";

import React from "react";
import { SlidersHorizontal, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useCategories, useStores } from "@/components/CatalogProvider";

export type SortField = "price" | "upload_time" | "expiry_time" | "discount";
export type SortDirection = "asc" | "desc";

interface StoreFilterBarProps {
  selectedStoreId: string;
  onSelectStore: (storeId: string) => void;
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
  sortDirection: SortDirection;
  onToggleSortDirection: () => void;
  totalResultsCount: number;
  onResetFilters: () => void;
}

export function StoreFilterBar({
  selectedStoreId,
  onSelectStore,
  selectedCategoryId,
  onSelectCategory,
  sortField,
  onSortFieldChange,
  sortDirection,
  onToggleSortDirection,
  totalResultsCount,
  onResetFilters,
}: StoreFilterBarProps) {
  const stores = useStores();
  const categories = useCategories();
  const isFiltered =
    selectedStoreId !== "all" ||
    selectedCategoryId !== "all" ||
    sortField !== "discount" ||
    sortDirection !== "desc";

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
              Filter Inventory
            </h3>
            <p className="text-[11px] font-semibold text-slate-500">
              Showing <span className="text-emerald-700 font-bold">{totalResultsCount} verified deals</span> ready for store or rider pickup
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
            className="block text-xs font-bold text-slate-700 mb-1.5"
          >
            Supermarket / Hub:
          </label>
          <div className="relative">
            <select
              id="store-filter-select"
              value={selectedStoreId}
              onChange={(e) => onSelectStore(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer appearance-none pr-8"
            >
              <option value="all">All Partner Stores</option>
              {stores.map((store) => (
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
            className="block text-xs font-bold text-slate-700 mb-1.5"
          >
            Department / Category:
          </label>
          <div className="relative">
            <select
              id="category-filter-select"
              value={selectedCategoryId}
              onChange={(e) => onSelectCategory(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer appearance-none pr-8"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
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

        {/* Simplified Sort Filter with Asc/Desc Button */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="sort-filter-select"
              className="block text-xs font-bold text-slate-700"
            >
              Sort By:
            </label>
            <span className="text-[10px] font-bold text-emerald-700">
              {sortDirection === "asc" ? "Ascending (Low to High / Earliest)" : "Descending (High to Low / Latest)"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                id="sort-filter-select"
                value={sortField}
                onChange={(e) => onSortFieldChange(e.target.value as SortField)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer appearance-none pr-8"
              >
                <option value="price">Price</option>
                <option value="upload_time">Time of upload</option>
                <option value="expiry_time">Time of expiry</option>
                <option value="discount">Biggest discount</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Asc / Desc Order Button */}
            <button
              type="button"
              onClick={onToggleSortDirection}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 transition-all cursor-pointer shrink-0 shadow-2xs flex items-center gap-1 text-xs font-bold"
              title={`Switch to ${sortDirection === "asc" ? "Descending" : "Ascending"}`}
              aria-label="Toggle sort order direction"
            >
              {sortDirection === "asc" ? (
                <>
                  <ArrowUp className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline text-[11px]">Asc</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline text-[11px]">Desc</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

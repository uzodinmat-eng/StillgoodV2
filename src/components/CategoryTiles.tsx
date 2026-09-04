"use client";

import React from "react";
import { useCategories } from "@/components/CatalogProvider";

interface CategoryTilesProps {
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryTiles({
  selectedCategoryId,
  onSelectCategory,
}: CategoryTilesProps) {
  const categories = useCategories();

  return (
    <section className="py-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
            Browse Categories
          </h2>
        </div>
        <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
          Filtered by Live Stock Availability
        </span>
      </div>

      {/* Categories Horizontal Scroll / Grid without icons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
        
        {/* All Categories Button */}
        <button
          type="button"
          onClick={() => onSelectCategory("all")}
          className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            selectedCategoryId === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
          }`}
        >
          <span>All Deals</span>
        </button>

        {categories.map((category) => {
          const isSelected = selectedCategoryId === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isSelected
                  ? "bg-emerald-800 text-white border-emerald-900 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/60 hover:border-emerald-200 shadow-2xs"
              }`}
            >
              <span>{category.name}</span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                  isSelected ? "bg-emerald-900/90 text-emerald-200" : "bg-slate-100 text-slate-500"
                }`}
              >
                {category.itemCount}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

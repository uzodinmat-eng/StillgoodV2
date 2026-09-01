"use client";

import React from "react";
import { 
  Milk, 
  Croissant, 
  Wheat, 
  Coffee, 
  Cookie, 
  Package, 
  Flame, 
  Snowflake, 
  LayoutGrid,
  LucideIcon 
} from "lucide-react";
import { CATEGORIES } from "@/lib/data";

const ICON_MAP: Record<string, LucideIcon> = {
  Milk,
  Croissant,
  Wheat,
  Coffee,
  Cookie,
  Package,
  Flame,
  Snowflake,
};

interface CategoryTilesProps {
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryTiles({
  selectedCategoryId,
  onSelectCategory,
}: CategoryTilesProps) {
  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
            Browse Near-Expiry Departments
          </h2>
        </div>
        <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
          Filtered by Abuja Stock Availability
        </span>
      </div>

      {/* Categories Horizontal Scroll / Grid */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
        
        {/* All Categories Button */}
        <button
          type="button"
          onClick={() => onSelectCategory("all")}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
            selectedCategoryId === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]"
              : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
          }`}
        >
          <div className={`p-1 rounded-lg ${selectedCategoryId === "all" ? "bg-slate-800 text-emerald-400" : "bg-slate-100 text-slate-700"}`}>
            <LayoutGrid className="w-3.5 h-3.5" />
          </div>
          <span>All Deals</span>
        </button>

        {CATEGORIES.map((category) => {
          const IconComponent = ICON_MAP[category.icon] || Package;
          const isSelected = selectedCategoryId === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                isSelected
                  ? "bg-emerald-800 text-white border-emerald-900 shadow-md shadow-emerald-950/20 scale-[1.02]"
                  : "bg-white text-slate-700 border-slate-200/80 hover:bg-emerald-50/50 hover:border-emerald-200 shadow-2xs"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isSelected
                    ? "bg-emerald-900/80 text-emerald-300"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="block leading-tight">{category.name}</span>
                <span
                  className={`text-[10px] font-semibold ${
                    isSelected ? "text-emerald-200" : "text-slate-400"
                  }`}
                >
                  {category.itemCount} items
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

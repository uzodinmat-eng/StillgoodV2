"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X, TrendingDown, Store as StoreIcon, Sparkles } from "lucide-react";
import { getProducts, STORES, CATEGORIES } from "@/lib/data";
import { formatNaira } from "@/lib/pricing";
import { Product, Store, Category } from "@/lib/types";

interface SearchAutocompleteProps {
  onSelectProduct?: (product: Product) => void;
  onSelectCategory?: (categoryId: string) => void;
  onSelectStore?: (storeId: string) => void;
  placeholder?: string;
}

export function SearchAutocomplete({
  onSelectProduct,
  onSelectCategory,
  onSelectStore,
  placeholder = "Search Peak Milk, Kellogg's, Barilla, Grand Square...",
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const products = getProducts();

  // Search results filtering
  const matchingProducts = query.trim()
    ? products
        .filter((p) => {
          const q = query.toLowerCase();
          const store = STORES.find((s) => s.id === p.storeId);
          return (
            p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            store?.name.toLowerCase().includes(q) ||
            store?.area.toLowerCase().includes(q)
          );
        })
        .slice(0, 5)
    : [];

  const matchingCategories = query.trim()
    ? CATEGORIES.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 2)
    : [];

  const matchingStores = query.trim()
    ? STORES.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.area.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 2)
    : [];

  const hasResults =
    matchingProducts.length > 0 ||
    matchingCategories.length > 0 ||
    matchingStores.length > 0;

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2 bg-slate-100 hover:bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/15 transition-all shadow-2xs font-medium"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2.5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto">
          {!hasResults ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No rescue groceries found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for brands like Peak, Heinz, Barilla, or store names like Wuse II.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              
              {/* Category Matches */}
              {matchingCategories.length > 0 && (
                <div className="p-2">
                  <p className="px-3 py-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-1.5 px-2 py-1">
                    {matchingCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          if (onSelectCategory) onSelectCategory(cat.id);
                          setIsOpen(false);
                          setQuery("");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>{cat.name} ({cat.itemCount})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Store Matches */}
              {matchingStores.length > 0 && (
                <div className="p-2">
                  <p className="px-3 py-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Abuja Supermarkets
                  </p>
                  <div className="space-y-1">
                    {matchingStores.map((store) => (
                      <button
                        key={store.id}
                        onClick={() => {
                          if (onSelectStore) onSelectStore(store.id);
                          setIsOpen(false);
                          setQuery("");
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-emerald-50 text-slate-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                            <StoreIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{store.name}</p>
                            <p className="text-[11px] text-slate-500">{store.area} • {store.openHours}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          {store.totalDeals} Deals
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Matches */}
              {matchingProducts.length > 0 && (
                <div className="p-2">
                  <p className="px-3 py-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Matching Products
                  </p>
                  <div className="space-y-1">
                    {matchingProducts.map((product) => {
                      const store = STORES.find((s) => s.id === product.storeId);
                      return (
                        <Link
                          key={product.id}
                          href={`/product/${product.slug}`}
                          onClick={() => {
                            if (onSelectProduct) onSelectProduct(product);
                            setIsOpen(false);
                            setQuery("");
                          }}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/80">
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                sizes="48px"
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-emerald-700 tracking-wide uppercase truncate">
                                {product.brand}
                              </p>
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {product.name}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {store?.name} ({store?.area}) • {product.unit}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-3">
                            <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-extrabold px-1.5 py-0.5 rounded-md border border-emerald-200">
                              <TrendingDown className="w-3 h-3" />
                              -{product.discountPercent}%
                            </span>
                            <div className="mt-0.5 flex items-baseline justify-end gap-1.5">
                              <span className="text-xs font-black text-slate-900">
                                {formatNaira(product.currentPrice)}
                              </span>
                              <span className="text-[10px] text-slate-400 line-through">
                                {formatNaira(product.originalPrice)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}

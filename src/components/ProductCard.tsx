"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  TrendingDown,
  MapPin,
  Check,
  Minus,
  Plus
} from "lucide-react";
import { Product, Store } from "@/lib/types";
import { formatNaira } from "@/lib/pricing";
import { useStoreById } from "@/components/CatalogProvider";
import { addToCart } from "@/lib/actions";

interface ProductCardProps {
  product: Product;
  onProductAddedToCart?: () => void;
}

export function ProductCard({
  product,
  onProductAddedToCart,
}: ProductCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isAdded, setIsAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const store = useStoreById(product.storeId);

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await addToCart({
        productId: product.id,
        quantity,
      });

      if (res.success) {
        setIsAdded(true);
        if (onProductAddedToCart) onProductAddedToCart();
        setTimeout(() => setIsAdded(false), 2000);
      }
    });
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      
      {/* Top Image Section */}
      <Link
        href={`/product/${product.slug}`}
        className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden block"
      >
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient overlay on top */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2 pointer-events-none">
          
          {/* Discount Ribbon */}
          <div className="inline-flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-1 rounded-xl text-xs font-black shadow-md">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>-{product.discountPercent}%</span>
          </div>

          {/* Storage Condition Badge */}
          <span className="inline-flex items-center gap-1 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
            {product.storageCondition === "frozen" ? "🧊 Frozen" : product.storageCondition === "chilled" ? "❄️ Chilled" : "📦 Ambient"}
          </span>
        </div>

        {/* Bottom Store Indicator on Image */}
        {store && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 pointer-events-none">
            <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-md text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs border border-white/40">
              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[200px]">{store.name} ({store.area})</span>
            </span>
          </div>
        )}
      </Link>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
        
        <div>
          {/* Brand & Stock warning */}
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[11px] font-black tracking-wider uppercase text-emerald-700">
              {product.brand}
            </span>
            {product.stockQuantity <= 5 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md">
                Only {product.stockQuantity} left
              </span>
            )}
          </div>

          <Link href={`/product/${product.slug}`} className="block">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-emerald-800 transition-colors">
              {product.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium line-clamp-1">
              Unit size: {product.unit} {product.conditionNotes ? `• ${product.conditionNotes}` : ""}
            </p>
          </Link>
        </div>

        {/* Price & Form Action Section */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          
          {/* Price Numbers */}
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {formatNaira(product.currentPrice)}
              </span>
              <span className="text-xs text-slate-400 line-through font-semibold">
                {formatNaira(product.originalPrice)}
              </span>
            </div>
          </div>

          {/* Quantity + Add to Cart */}
          <form onSubmit={handleAddToCart} className="flex items-center gap-1.5">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="quantity" value={quantity} />

            <div className="inline-flex items-center border border-slate-200 rounded-xl overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={isPending || quantity <= 1 || product.stockQuantity === 0}
                className="px-2 py-2.5 text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="min-w-[1.75rem] text-center text-xs font-black text-slate-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                disabled={isPending || quantity >= product.stockQuantity || product.stockQuantity === 0}
                className="px-2 py-2.5 text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-40"
                aria-label="Increase quantity"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <button
              type="submit"
              disabled={isPending || product.stockQuantity === 0}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                isAdded
                  ? "bg-emerald-700 text-white"
                  : product.stockQuantity === 0
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20"
              }`}
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add</span>
                </>
              )}
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}

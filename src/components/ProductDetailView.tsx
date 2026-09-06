"use client";

import React, { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  ShieldCheck,
  TrendingDown,
  Check,
  Sparkles,
  Building2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { ProductCard } from "@/components/ProductCard";
import { Footer } from "@/components/Footer";
import { addToCart, getCart } from "@/lib/actions";
import { useCategoryById, useStoreById } from "@/components/CatalogProvider";
import { CartSummary, Product } from "@/lib/types";
import {
  calculateDriftPrice,
  formatNaira,
  getUrgencyBadge,
} from "@/lib/pricing";

interface ProductDetailViewProps {
  product: Product;
  relatedProducts: Product[];
}

const emptyCart: CartSummary = {
  items: [],
  itemCount: 0,
  subtotal: 0,
  originalSubtotal: 0,
  savingsTotal: 0,
  platformFee: 0,
  total: 0,
  storesInvolved: [],
};

export function ProductDetailView({
  product,
  relatedProducts,
}: ProductDetailViewProps) {
  const store = useStoreById(product.storeId);
  const category = useCategoryById(product.category);
  const urgency = getUrgencyBadge(product.daysRemaining, product.dateType);
  const drift = calculateDriftPrice({
    originalPrice: product.originalPrice,
    baseDiscountPercent: product.baseDiscountPercent,
    listedAt: product.listedAt,
    weeklyDriftRate: product.driftRateWeekly,
  });

  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [seenProductId, setSeenProductId] = useState(product.id);
  const [isPending, startTransition] = useTransition();
  const [cartSummary, setCartSummary] = useState<CartSummary>(emptyCart);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (seenProductId !== product.id) {
    setSeenProductId(product.id);
    setQuantity(1);
    setIsAdded(false);
  }

  const maxQty = Math.max(1, product.stockQuantity);
  const soldOut = product.stockQuantity < 1 || !product.isAvailable;

  const refreshCart = async () => {
    try {
      setCartSummary(await getCart());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let cancelled = false;
    getCart()
      .then((summary) => {
        if (!cancelled) setCartSummary(summary);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAdd = () => {
    if (soldOut) return;
    startTransition(async () => {
      const result = await addToCart({
        productId: product.id,
        quantity,
      });
      if (result.success) {
        setIsAdded(true);
        await refreshCart();
        setTimeout(() => setIsAdded(false), 2000);
      }
    });
  };

  const storageLabel =
    product.storageCondition === "frozen"
      ? "Frozen"
      : product.storageCondition === "chilled"
        ? "Chilled"
        : "Ambient";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        cartItemCount={cartSummary.itemCount}
        cartSubtotal={cartSummary.subtotal}
        onOpenCart={() => setCartDrawerOpen(true)}
      />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          <div className="relative aspect-4/3 lg:aspect-square rounded-3xl overflow-hidden bg-slate-100 border border-slate-200">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
              <div className="inline-flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-1 rounded-xl text-xs font-black shadow-md">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>-{product.discountPercent}%</span>
              </div>
              <span className="inline-flex items-center bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                {storageLabel}
              </span>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-black tracking-wider uppercase text-emerald-700">
                {product.brand}
                {category ? ` · ${category.name}` : ""}
              </p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
                {product.name}
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-2">
                {product.unit}
                {product.conditionNotes ? ` · ${product.conditionNotes}` : ""}
              </p>
            </div>

            <div
              className={`flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs font-bold ${urgency.bgColor}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Clock className={`w-3.5 h-3.5 ${urgency.textColor}`} />
                {urgency.label}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-80">
                {urgency.tag}
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {formatNaira(product.currentPrice)}
                </span>
                <span className="text-sm text-slate-400 line-through font-semibold">
                  {formatNaira(product.originalPrice)}
                </span>
              </div>
              <p className="text-xs font-bold text-emerald-700 mt-1">
                You save {formatNaira(product.originalPrice - product.currentPrice)}{" "}
                vs supermarket shelf
              </p>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              {product.description}
            </p>

            <button
              type="button"
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-left cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                  <TrendingDown className="w-3.5 h-3.5" />
                </span>
                <span>
                  <span className="block text-[11px] font-black text-emerald-950">
                    Weekly drift pricing
                  </span>
                  <span className="block text-[11px] text-emerald-800 font-medium">
                    Next drop in {drift.nextDropDays} day
                    {drift.nextDropDays === 1 ? "" : "s"} · floor 85% off
                  </span>
                </span>
              </span>
              <span className="text-[11px] font-bold text-emerald-800">Schedule</span>
            </button>

            {store ? (
              <Link
                href={`/stores/${store.slug}`}
                className="block p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition-colors"
              >
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Pickup supermarket
                </p>
                <p className="text-sm font-black text-slate-900 mt-1">{store.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {store.address} ({store.area})
                </p>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  {store.pickupInstructions}
                </p>
              </Link>
            ) : null}

            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
              {product.nafdacRegNo ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  NAFDAC {product.nafdacRegNo}
                </span>
              ) : null}
              {product.stockQuantity <= 5 ? (
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                  Only {product.stockQuantity} left
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                  {product.stockQuantity} in the Stillgood bin
                </span>
              )}
            </div>

            {product.nutritionalHighlights && product.nutritionalHighlights.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {product.nutritionalHighlights.map((note) => (
                  <li
                    key={note}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg"
                  >
                    {note}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex items-center gap-3 pt-2">
              <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={soldOut || quantity <= 1}
                  className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="min-w-[2rem] text-center text-sm font-black text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={soldOut || quantity >= maxQty}
                  className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={isPending || soldOut}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-60 ${
                  isAdded
                    ? "bg-emerald-700 text-white"
                    : soldOut
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-700/20"
                }`}
              >
                {isPending ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    Added to basket
                  </>
                ) : soldOut ? (
                  "Sold out"
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    Add {quantity} · {formatNaira(product.currentPrice * quantity)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {product.driftSchedule && product.driftSchedule.length > 0 ? (
          <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Drift timeline
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {product.driftSchedule.map((step) => (
                <div
                  key={`${step.label}-${step.date}`}
                  className={`rounded-2xl border p-3 ${
                    step.isCurrent
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {step.label}
                  </p>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {formatNaira(step.price)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {step.discountPercent}% off · {step.date}
                    {step.isCurrent ? " · now" : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {relatedProducts.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              More rescue deals
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedProducts.map((related) => (
                <ProductCard
                  key={related.id}
                  product={related}
                  onProductAddedToCart={refreshCart}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <Footer />

      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cartSummary={cartSummary}
        onProceedToCheckout={() => {
          setCartDrawerOpen(false);
          setCheckoutOpen(true);
        }}
      />
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cartSummary={cartSummary}
        onOrderCreated={() => {
          refreshCart();
        }}
      />
    </div>
  );
}

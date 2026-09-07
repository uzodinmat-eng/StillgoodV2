"use client";

import React, { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  TrendingDown
} from "lucide-react";
import { CartSummary, PopulatedCartItem } from "@/lib/types";
import { formatNaira } from "@/lib/pricing";
import { updateCartQuantity, removeFromCart, clearCart } from "@/lib/actions";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartSummary: CartSummary;
  onProceedToCheckout: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  cartSummary,
  onProceedToCheckout,
}: CartDrawerProps) {
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleUpdateQty = (productId: string, newQty: number) => {
    startTransition(async () => {
      await updateCartQuantity(productId, newQty);
    });
  };

  const handleRemove = (productId: string) => {
    startTransition(async () => {
      await removeFromCart(productId);
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      await clearCart();
    });
  };

  // Group items by store
  const itemsByStore: Record<string, PopulatedCartItem[]> = {};
  cartSummary.items.forEach((item) => {
    const sId = item.store.id;
    if (!itemsByStore[sId]) itemsByStore[sId] = [];
    itemsByStore[sId].push(item);
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Your Pickup Basket
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  {cartSummary.itemCount} {cartSummary.itemCount === 1 ? "rescue item" : "rescue items"} reserved
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cartSummary.items.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isPending}
                  className="text-xs text-slate-500 hover:text-rose-600 font-bold px-2 py-1 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            
            {cartSummary.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-inner">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Your basket is empty
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Surplus grocery deals from Grand Square, H-Medix, Next Cash & Carry and more are waiting.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
                >
                  Explore Abuja Deals
                </button>
              </div>
            ) : (
              <>
                {/* Savings Callout Banner */}
                {cartSummary.savingsTotal > 0 && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-300">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-extrabold">
                          Total Basket Savings
                        </p>
                        <p className="text-sm font-black text-white">
                          You save {formatNaira(cartSummary.savingsTotal)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-lg">
                      Clearance Deals
                    </span>
                  </div>
                )}

                {/* Items Grouped by Store */}
                {Object.entries(itemsByStore).map(([storeId, items]) => {
                  const store = items[0].store;
                  return (
                    <div key={storeId} className="space-y-3">
                      
                      {/* Store Header */}
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-black text-slate-900">
                            {cartSummary.storesInvolved.length > 1
                              ? `From: ${store.name}`
                              : `Pickup: ${store.name}`}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {store.area} • {store.openHours}
                          </p>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div
                            key={item.product.id}
                            className="flex gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                          >
                            <Link
                              href={`/product/${item.product.slug}`}
                              onClick={onClose}
                              className="relative w-16 h-16 rounded-xl bg-white overflow-hidden shrink-0 border border-slate-200"
                            >
                              <Image
                                src={item.product.images[0]}
                                alt={item.product.name}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            </Link>

                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-1">
                                  <Link
                                    href={`/product/${item.product.slug}`}
                                    onClick={onClose}
                                    className="text-xs font-bold text-slate-900 truncate hover:text-emerald-800"
                                  >
                                    {item.product.name}
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleRemove(item.product.id)}
                                    className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  {item.product.unit} • Best before in {item.product.daysRemaining} days
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <div>
                                  <span className="text-xs font-black text-slate-900">
                                    {formatNaira(item.itemTotal)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 line-through ml-1">
                                    {formatNaira(item.originalItemTotal)}
                                  </span>
                                </div>

                                {/* Quantity Stepper */}
                                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(item.product.id, item.quantity - 1)}
                                    disabled={isPending}
                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-xs font-bold text-slate-900 px-1 min-w-[16px] text-center">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(item.product.id, item.quantity + 1)}
                                    disabled={isPending || item.quantity >= item.product.stockQuantity}
                                    className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer disabled:opacity-40"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  );
                })}

                {/* Pickup Instructions Alert */}
                {cartSummary.storesInvolved.length > 1 ? (
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <p className="text-emerald-950 font-medium leading-relaxed">
                      <strong>Multi-store basket:</strong> items from{" "}
                      {cartSummary.storesInvolved.length} supermarkets will be
                      consolidated in the noon or evening batch to one pickup hub.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <p className="text-amber-900 font-medium leading-relaxed">
                      <strong>Direct pickup:</strong> collect at the store customer
                      care desk, or send a dispatch rider with your SG-XXXXX code
                      and 4-digit PIN.
                    </p>
                  </div>
                )}
              </>
            )}

          </div>

          {/* Footer with Totals & Checkout CTA */}
          {cartSummary.items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 space-y-3.5">
              
              {/* Financial Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Groceries Subtotal</span>
                  <span>{formatNaira(cartSummary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Pickup & handling fee</span>
                  <span>{formatNaira(cartSummary.pickupFee)}</span>
                </div>
                {cartSummary.savingsTotal > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Total Discount Saved</span>
                    <span>-{formatNaira(cartSummary.savingsTotal)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-emerald-700">{formatNaira(cartSummary.total)}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProceedToCheckout();
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-700/25 transition-all cursor-pointer active:scale-98"
              >
                <span>Proceed to Pickup Scheduling</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>
          )}

        </div>
      </div>

    </div>
  );
}

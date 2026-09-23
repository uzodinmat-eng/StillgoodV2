"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Store, Truck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { HeroBanner } from "@/components/HeroBanner";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Footer } from "@/components/Footer";
import { useStores } from "@/components/CatalogProvider";
import { CartSummary } from "@/lib/types";
import { getCart } from "@/lib/actions";

export default function HomePage() {
  const stores = useStores();

  const [cartSummary, setCartSummary] = useState<CartSummary>({
    items: [],
    itemCount: 0,
    subtotal: 0,
    originalSubtotal: 0,
    savingsTotal: 0,
    platformFee: 0,
    pickupFee: 0,
    total: 0,
    storesInvolved: [],
  });
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const refreshCart = async () => {
    try {
      const updated = await getCart();
      setCartSummary(updated);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let cancelled = false;
    getCart()
      .then((updated) => {
        if (!cancelled) setCartSummary(updated);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-emerald-500 selection:text-white">
      <Navbar
        cartItemCount={cartSummary.itemCount}
        cartSubtotal={cartSummary.subtotal}
        onOpenCart={() => setCartDrawerOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-8">
        <HeroBanner />

        <section id="hub-fulfillment" className="bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white border border-emerald-700/40 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black uppercase">
                <Truck className="w-3.5 h-3.5" />
                <span>Multi-Store Consolidation</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Ordering from multiple stores? We consolidate your bag.
              </h2>

              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium leading-relaxed">
                If your cart contains items from multiple supermarkets, our fleet runs <strong>two daily consolidation batches</strong> to bring everything to your selected central pickup hub or dispatch location. No need to visit multiple stores.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
                <p className="text-amber-300 font-black text-sm">Batch 1: 12:00 PM</p>
                <p className="text-[11px] text-emerald-100/80 mt-0.5">Morning multi-store orders ready for afternoon pickup.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
                <p className="text-emerald-300 font-black text-sm">Batch 2: 5:00 PM</p>
                <p className="text-[11px] text-emerald-100/80 mt-0.5">Afternoon multi-store orders ready for evening collection.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="my-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Verified Supermarket Pickup Locations
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Order online and pick up at the store or send a dispatch rider with your SG-XXXXX code.
              </p>
            </div>
            <Link
              href="/stores"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View All Hubs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <div
                key={store.id}
                className="p-4 rounded-3xl border transition-all bg-white flex flex-col justify-between border-slate-200/90 hover:border-emerald-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start gap-3">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-slate-200">
                      <Image
                        src={store.image}
                        alt={store.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-black text-slate-900 mt-1 truncate">
                        {store.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {store.address}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-600 font-medium">
                    <span className="font-bold text-slate-900">Pickup:</span> {store.pickupInstructions}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {store.totalDeals} active surplus deals
                  </span>
                  <Link
                    href={`/shop?store=${encodeURIComponent(store.id)}`}
                    className="font-bold text-emerald-700 hover:text-emerald-900 text-xs"
                  >
                    Shop this store
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-emerald-700 text-[11px] font-black uppercase tracking-wider">
                <Store className="w-3.5 h-3.5" />
                <span>For supermarkets</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Are you a store?
              </h2>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                List short-dated groceries, confirm what is still on the shelf, and withdraw settled pickup funds to your bank account.
              </p>
            </div>
            <Link
              href="/store/register"
              className="inline-flex items-center justify-center gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm px-5 py-3.5 rounded-2xl shadow-md shadow-emerald-700/20"
            >
              Register your store
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => {
          setCartDrawerOpen(false);
          setCartNotice(null);
        }}
        cartSummary={cartSummary}
        notice={cartNotice}
        onProceedToCheckout={() => setCheckoutModalOpen(true)}
        onCartChanged={setCartSummary}
      />

      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        cartSummary={cartSummary}
        onOrderCreated={() => {
          refreshCart();
        }}
        onReturnToBasket={(message) => {
          setCheckoutModalOpen(false);
          setCartNotice(message);
          setCartDrawerOpen(true);
        }}
      />

      <Footer />
    </div>
  );
}

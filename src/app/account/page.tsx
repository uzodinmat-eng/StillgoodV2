"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LogOut,
  Package,
  Wallet,
  Sparkles,
  User,
  MapPin,
  Clock,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { AuthModal } from "@/components/AuthModal";
import { getAccount, logout } from "@/lib/auth";
import { getCart } from "@/lib/actions";
import { CartSummary, Customer, Order } from "@/lib/types";
import { formatNaira } from "@/lib/pricing";

export default function AccountPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [savingsTotal, setSavingsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartSummary, setCartSummary] = useState<CartSummary>({
    items: [],
    itemCount: 0,
    subtotal: 0,
    originalSubtotal: 0,
    savingsTotal: 0,
    platformFee: 0,
    total: 0,
    storesInvolved: [],
  });

  const loadAccount = async () => {
    const account = await getAccount();
    setCustomer(account.customer);
    setOrders(account.orders);
    setSavingsTotal(account.savingsTotal);
    setLoading(false);
    if (!account.customer) setAuthOpen(true);
  };

  const refreshCart = async () => {
    try {
      setCartSummary(await getCart());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadAccount();
    refreshCart();
  }, []);

  const handleLogout = async () => {
    await logout();
    setCustomer(null);
    setOrders([]);
    setSavingsTotal(0);
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        cartItemCount={cartSummary.itemCount}
        cartSubtotal={cartSummary.subtotal}
        onOpenCart={() => setCartDrawerOpen(true)}
      />

      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to marketplace
        </Link>

        {loading ? (
          <p className="text-xs font-bold text-slate-500">Loading account…</p>
        ) : !customer ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <User className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-black text-slate-900">Log in to see your account</h1>
            <p className="text-xs text-slate-500">
              Order history, savings, and Stillgood Wallet require a buyer login. Guest checkout still works from the basket.
            </p>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              Log in with WhatsApp
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-emerald-950 to-slate-900 rounded-3xl p-6 text-white space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                Buyer account
              </p>
              <h1 className="text-2xl font-black tracking-tight">{customer.name}</h1>
              <p className="text-xs text-emerald-100/80">{customer.phone}</p>
              {customer.email ? (
                <p className="text-xs text-emerald-100/70">{customer.email}</p>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-200 hover:text-white"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    Lifetime savings
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900">
                  {formatNaira(savingsTotal)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Retail minus Stillgood price on your orders.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Wallet className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    Stillgood Wallet
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900">
                  {formatNaira(customer.walletBalance)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Missing-item refunds credit here. Wallet checkout only works when this covers the order total.
                </p>
              </div>
            </div>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Your orders
                </h2>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                  <p className="text-sm font-bold text-slate-800">No orders yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Place a guest or logged-in order and it will show here as SG-XXXXX.
                  </p>
                  <Link
                    href="/"
                    className="inline-block mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                  >
                    Shop rescue deals
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/order/${order.id}`}
                      className="block bg-white rounded-2xl border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">{order.id}</p>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            {order.storeName} ({order.storeArea})
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {order.pickupDate} · {order.pickupTimeSlot}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-emerald-700">
                            {formatNaira(order.total)}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">
                            {order.status.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cartSummary={cartSummary}
        onProceedToCheckout={() => setCheckoutOpen(true)}
      />
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cartSummary={cartSummary}
        onOrderCreated={() => {
          refreshCart();
          loadAccount();
        }}
      />
      <AuthModal
        isOpen={authOpen && !customer}
        onClose={() => {
          setAuthOpen(false);
          if (!customer) router.push("/");
        }}
        onLoggedIn={() => {
          setAuthOpen(false);
          loadAccount();
        }}
      />
    </div>
  );
}

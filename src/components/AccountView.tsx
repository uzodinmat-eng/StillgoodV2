"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Landmark, LogOut, Package, Sparkles, User, MapPin, Clock } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { AuthModal } from "@/components/AuthModal";
import { logout } from "@/lib/auth";
import { getCart } from "@/lib/actions";
import { getMyBankAccountAction, listBanksAction, saveMyBankAccountAction } from "@/lib/bank-accounts";
import type { PaystackBank } from "@/lib/paystack";
import { CartSummary, Customer, Order } from "@/lib/types";
import { formatNaira } from "@/lib/pricing";

interface AccountViewProps {
  initialCustomer: Customer | null;
  initialOrders: Order[];
  initialSavingsTotal: number;
}

export function AccountView({
  initialCustomer,
  initialOrders,
  initialSavingsTotal,
}: AccountViewProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(initialCustomer);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [savingsTotal, setSavingsTotal] = useState(initialSavingsTotal);
  const [authOpen, setAuthOpen] = useState(!initialCustomer);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Verified refund bank account state.
  const [banks, setBanks] = useState<PaystackBank[]>([]);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [bankCode, setBankCode] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankMsg, setBankMsg] = useState<string | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);
  const [savedBank, setSavedBank] = useState<{
    bankCode?: string;
    bankName?: string;
    maskedAccount?: string;
    accountName?: string;
    resolvedAccountName?: string;
    verified?: boolean;
  } | null>(null);
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

  useEffect(() => {
    getCart()
      .then(setCartSummary)
      .catch(() => undefined);
  }, []);

  // Load the bank list + saved verified refund account once signed in.
  useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    void listBanksAction().then((result) => {
      if (cancelled) return;
      if (result.success && result.banks) {
        setBanks(result.banks);
      } else {
        setBanksError(result.error || "Could not load the bank list.");
      }
    });
    void getMyBankAccountAction().then((result) => {
      if (cancelled || !result.success) return;
      setSavedBank({
        bankCode: result.bankCode,
        bankName: result.bankName,
        maskedAccount: result.maskedAccount,
        accountName: result.accountName,
        resolvedAccountName: result.resolvedAccountName,
        verified: result.verified,
      });
      if (result.bankCode && !bankCode) setBankCode(result.bankCode);
    });
    return () => {
      cancelled = true;
    };
  }, [customer, bankCode]);

  // Sync server-provided account updates into local state via a microtask so
  // the effect body itself only subscribes (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!initialCustomer) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setCustomer(initialCustomer);
      setOrders(initialOrders);
      setSavingsTotal(initialSavingsTotal);
      setAuthOpen(false);
    });
    return () => {
      cancelled = true;
    };
  }, [initialCustomer, initialOrders, initialSavingsTotal]);

  const applyAccount = (account: {
    customer: Customer | null;
    orders: Order[];
    savingsTotal: number;
  }) => {
    if (!account.customer) return;
    setCustomer(account.customer);
    setOrders(account.orders);
    setSavingsTotal(account.savingsTotal);
    setAuthOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setCustomer(null);
    setOrders([]);
    setSavingsTotal(0);
    setSavedBank(null);
    router.push("/");
    router.refresh();
  };

  const selectedBank = banks.find((bank) => bank.code === bankCode) || null;

  const handleBankSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedBank) {
      setBankError("Pick a bank.");
      return;
    }
    setBankMsg(null);
    setBankError(null);
    startTransition(async () => {
      const result = await saveMyBankAccountAction({
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
        accountNumber: bankAccountNumber.trim(),
      });
      if (!result.success) {
        setBankError(result.error || "Could not verify the account.");
        return;
      }
      setSavedBank({
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
        maskedAccount: result.maskedAccount,
        accountName: customer?.name,
        resolvedAccountName: result.resolvedName,
        verified: true,
      });
      setBankMsg(`Verified: ${result.resolvedName} ✓ — refunds will use ${selectedBank.name} ${result.maskedAccount}.`);
      setBankAccountNumber("");
      router.refresh();
    });
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

        {!customer ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <User className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-black text-slate-900">Log in to see your account</h1>
            <p className="text-xs text-slate-500">
              Order history, savings, and Stillgood Wallet require an email or Google login. Guest checkout still works from the basket.
            </p>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
            >
              Log in with email
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-emerald-950 to-slate-900 rounded-3xl p-6 text-white space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                Buyer account
              </p>
              <h1 className="text-2xl font-black tracking-tight">{customer.name}</h1>
              {customer.email ? (
                <p className="text-xs text-emerald-100/80">{customer.email}</p>
              ) : null}
              {customer.phone ? (
                <p className="text-xs text-emerald-100/70">{customer.phone}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {customer.role === "admin" && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-200 hover:text-white"
                  >
                    Admin desk
                  </Link>
                )}
                {(customer.role === "admin" || customer.storeId) && (
                  <Link
                    href="/store"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-200 hover:text-white"
                  >
                    Store portal
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-200 hover:text-white cursor-pointer"
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
                  <Landmark className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    Order history
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900">
                  {orders.length}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Unavailable items are refunded manually to your verified bank account.
                </p>
              </div>
            </div>

            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Refund bank account
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Required before checkout. Unavailable items are refunded manually to this verified account after pickup is finalized.
              </p>
              {savedBank?.verified && (
                <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  {savedBank.bankName} {savedBank.maskedAccount} ✓ {savedBank.resolvedAccountName}
                </p>
              )}
              {bankMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  {bankMsg}
                </div>
              )}
              {bankError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {bankError}
                </div>
              )}
              {banksError && (
                <p className="text-[11px] font-bold text-amber-700">{banksError}</p>
              )}
              <form onSubmit={handleBankSubmit} className="grid sm:grid-cols-2 gap-3">
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>Bank</span>
                  <select
                    required
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Pick a bank</option>
                    {banks.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>10-digit account number</span>
                  <input
                    required
                    inputMode="numeric"
                    maxLength={10}
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="0123456789"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-60"
                  >
                    {isPending ? "Verifying…" : "Verify and save account"}
                  </button>
                </div>
              </form>
            </section>

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
                            {order.pickupDestinationName || order.storeName} · {order.pickupMode === "hub" ? "Hub pickup" : "Store pickup"}
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
                          <div className="flex flex-wrap items-center justify-end gap-1 mt-1">
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              {order.status.replace("_", " ")}
                            </p>
                            {order.items.some((item) => item.fulfillmentStatus === "unavailable") && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-black uppercase">
                                Adjusted
                              </span>
                            )}
                          </div>
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
        onCartChanged={setCartSummary}
      />
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cartSummary={cartSummary}
        onOrderCreated={() => {
          getCart().then(setCartSummary).catch(() => undefined);
          router.refresh();
        }}
      />
      <AuthModal
        isOpen={authOpen && !customer}
        onClose={() => setAuthOpen(false)}
        onLoggedIn={async (account) => {
          applyAccount(account);
        }}
      />
    </div>
  );
}

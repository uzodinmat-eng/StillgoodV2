"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  LogOut,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { createStoreAction } from "@/lib/admin";
import { logout } from "@/lib/auth";
import { formatNaira } from "@/lib/pricing";
import { Customer, Order, Store } from "@/lib/types";

interface AdminViewProps {
  customer: Customer | null;
  isAdmin: boolean;
  stores: Store[];
  orders: Order[];
  areas: Store["area"][];
}

export function AdminView({
  customer,
  isAdmin,
  stores,
  orders,
  areas,
}: AdminViewProps) {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(!customer);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [area, setArea] = useState<Store["area"]>(areas[0] || "Central Area");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [openHours, setOpenHours] = useState("8:00 AM – 9:00 PM (Daily)");

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    startTransition(async () => {
      const result = await createStoreAction({
        name,
        area,
        address,
        phone,
        openHours,
      });
      if (!result.success || !result.store) {
        setErrorMsg(result.error || "Could not create the store.");
        return;
      }
      setInfoMsg(`${result.store.name} is live. Shop and this desk now share that row.`);
      setName("");
      setAddress("");
      setPhone("");
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
              Stillgood ops
            </p>
            <h1 className="text-xl font-black tracking-tight">Admin desk</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Marketplace
            </Link>
            {customer && (
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.refresh();
                }}
                className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {!customer && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Log in with an email on <code className="font-mono text-xs">ADMIN_EMAILS</code>.
            Guest checkout is for the shop, not this desk.
          </section>
        )}

        {customer && !isAdmin && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            <p className="font-bold">Signed in as {customer.email}</p>
            <p className="mt-1">
              This account cannot open the admin desk. Add the email to{" "}
              <code className="font-mono text-xs">ADMIN_EMAILS</code> in{" "}
              <code className="font-mono text-xs">.env.local</code> and sign in again.
            </p>
          </section>
        )}

        {isAdmin && (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-black uppercase tracking-wider">
                  Register a store
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Admin-driven onboarding. Writes the same <code className="font-mono">stores</code>{" "}
                row the shop already reads. CAC, bank, and owner login come later.
              </p>
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {errorMsg}
                </div>
              )}
              {infoMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  {infoMsg}
                </div>
              )}
              <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-3">
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>Business / branch name</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Bakan Gizo — Gwarinpa 1st Ave"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>Area</span>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value as Store["area"])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  >
                    {areas.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sm:col-span-2 text-[11px] font-bold text-slate-500 space-y-1">
                  <span>Address</span>
                  <input
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="1st Avenue, Gwarinpa, Abuja"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>Contact phone</span>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 803 000 0000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>Open hours</span>
                  <input
                    value={openHours}
                    onChange={(e) => setOpenHours(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-60"
                  >
                    {isPending ? "Saving…" : "Create store"}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-black uppercase tracking-wider">
                  Stores ({stores.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Area</th>
                      <th className="py-2 pr-3">Deals</th>
                      <th className="py-2">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store) => (
                      <tr key={store.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3 font-bold text-slate-900">
                          <Link
                            href={`/stores/${store.slug}`}
                            className="hover:text-emerald-700"
                          >
                            {store.name}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 text-slate-600">{store.area}</td>
                        <td className="py-2 pr-3 text-slate-600">{store.totalDeals}</td>
                        <td className="py-2 text-slate-600">{store.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-black uppercase tracking-wider">
                  All orders ({orders.length})
                </h2>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                SG-XXXXX is the order label. The 4-digit PIN is for the attendant.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2 pr-3">Order</th>
                      <th className="py-2 pr-3">Customer</th>
                      <th className="py-2 pr-3">Store</th>
                      <th className="py-2 pr-3">Total</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">PIN</th>
                      <th className="py-2">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-slate-500">
                          No orders yet.
                        </td>
                      </tr>
                    )}
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3 font-black text-slate-900">
                          <Link
                            href={`/order/${order.id}`}
                            className="hover:text-emerald-700"
                          >
                            {order.id}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 text-slate-600">
                          <div className="font-bold text-slate-800">
                            {order.customerName}
                          </div>
                          <div>{order.customerEmail}</div>
                        </td>
                        <td className="py-2 pr-3 text-slate-600">{order.storeName}</td>
                        <td className="py-2 pr-3 font-bold">{formatNaira(order.total)}</td>
                        <td className="py-2 pr-3">{order.status.replaceAll("_", " ")}</td>
                        <td className="py-2 pr-3 font-mono font-bold">
                          {order.pickupVerificationCode}
                        </td>
                        <td className="py-2 text-slate-600">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        nextPath="/admin"
        allowGuest={false}
        title="Admin sign in"
        subtitle="Email or Google. This is not guest checkout. Only allow-listed emails can register stores or see every SG-XXXXX."
        onLoggedIn={async () => {
          setAuthOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

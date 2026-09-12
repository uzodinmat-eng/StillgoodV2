"use client";

import React, { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  LogOut,
  MessageSquare,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { AdminSignInForm } from "@/components/AdminSignInForm";
import { StoreMessageThread, ThreadMessage } from "@/components/StoreMessageThread";
import {
  createStoreAction,
  deleteProductAsAdmin,
  deleteStoreAsAdmin,
  getStoreThreadAction,
  listStoreProductsAction,
  sendAdminMessageAction,
  setStoreActiveAction,
  setStoreStatusAction,
} from "@/lib/admin";
import { logout } from "@/lib/auth";
import { formatNaira } from "@/lib/pricing";
import { Customer, Order, Store, STORE_AREAS, StoreStatus } from "@/lib/types";
import type { AdminStats, AdminStatsFilters } from "@/lib/db/admin-stats";

interface AdminViewProps {
  customer: Customer | null;
  isAdmin: boolean;
  stores: Store[];
  pendingStores?: Store[];
  orders: Order[];
  areas?: Store["area"][];
  stats?: AdminStats | null;
  filters?: AdminStatsFilters;
}

type StoreProductRow = {
  id: string;
  name: string;
  brand: string;
  stockQuantity: number;
  currentPrice: number;
};

function formatLatency(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "—";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function decisionLatency(orderCreatedAt: string, decidedAt?: string): number | null {
  if (!decidedAt) return null;
  const ms = new Date(decidedAt).getTime() - new Date(orderCreatedAt).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function AdminStoreRow({
  store,
  onChanged,
}: {
  store: Store;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [products, setProducts] = useState<StoreProductRow[] | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    const result = await listStoreProductsAction(store.id);
    if (result.success) {
      setProducts(result.products || []);
    } else {
      setProductsError(result.error || "Could not load products.");
    }
    setProductsLoading(false);
  }, [store.id]);

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && products === null && !productsLoading) {
      void loadProducts();
    }
  };

  const handleActiveToggle = () => {
    setRowMsg(null);
    setRowError(null);
    startTransition(async () => {
      const res = await setStoreActiveAction(store.id, !store.isActive);
      if (!res.success) {
        setRowError(res.error || "Failed to update store.");
        return;
      }
      setRowMsg(store.isActive ? "Store suspended." : "Store re-activated.");
      onChanged();
    });
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        `${store.name} will be permanently deleted. Stores with order history cannot be deleted — suspend them instead. Continue?`
      )
    ) {
      return;
    }
    setRowMsg(null);
    setRowError(null);
    startTransition(async () => {
      const res = await deleteStoreAsAdmin(store.id);
      if (!res.success) {
        setRowError(res.error || "Could not delete the store.");
        return;
      }
      setRowMsg("Store deleted.");
      onChanged();
    });
  };

  const handleRemoveProduct = (productId: string, productName: string) => {
    if (!window.confirm(`Remove "${productName}" from the marketplace?`)) return;
    setRowMsg(null);
    setRowError(null);
    startTransition(async () => {
      const res = await deleteProductAsAdmin(productId);
      if (!res.success) {
        setRowError(res.error || "Could not remove the product.");
        return;
      }
      setProducts((current) => (current || []).filter((p) => p.id !== productId));
      setRowMsg(`Removed ${productName}.`);
      onChanged();
    });
  };

  const fetchMessages = useCallback(async (): Promise<ThreadMessage[]> => {
    const result = await getStoreThreadAction(store.id);
    if (!result.success) {
      throw new Error(result.error || "Could not load messages.");
    }
    return (result.messages || []).map((m) => ({
      id: m.id,
      senderRole: m.senderRole,
      body: m.body,
      createdAt: m.createdAt,
    }));
  }, [store.id]);

  const sendMessage = useCallback(
    async (body: string) => sendAdminMessageAction(store.id, body),
    [store.id]
  );

  return (
    <>
      <tr key={store.id} className="border-t border-slate-100">
        <td className="py-2 pr-3 font-bold text-slate-900">
          <button
            type="button"
            onClick={toggleExpanded}
            className="hover:text-emerald-700 text-left"
            title={expanded ? "Collapse" : "Expand for products and messages"}
          >
            {expanded ? "▾" : "▸"} {store.name}
          </button>
          <div className="text-[11px] font-normal text-slate-500">{store.address}</div>
        </td>
        <td className="py-2 pr-3 text-slate-600">{store.area}</td>
        <td className="py-2 pr-3 text-slate-600">{store.totalDeals}</td>
        <td className="py-2 pr-3">
          <button
            type="button"
            disabled={isPending}
            onClick={handleActiveToggle}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black disabled:opacity-50 ${
              store.isActive
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}
          >
            {store.isActive ? "Active" : "Inactive"}
          </button>
        </td>
        <td className="py-2 text-right space-x-2 whitespace-nowrap">
          <Link
            href={`/stores/${store.slug}`}
            className="text-[11px] font-bold text-emerald-700 hover:underline"
          >
            View
          </Link>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-[11px] disabled:opacity-50"
          >
            Delete
          </button>
        </td>
      </tr>
      {(rowMsg || rowError) && (
        <tr className="border-t border-slate-50">
          <td colSpan={5} className="py-1">
            {rowMsg && <p className="text-[11px] font-bold text-emerald-700">{rowMsg}</p>}
            {rowError && <p className="text-[11px] font-bold text-rose-600">{rowError}</p>}
          </td>
        </tr>
      )}
      {expanded && (
        <tr className="border-t border-slate-50 bg-slate-50/60">
          <td colSpan={5} className="py-3 px-3">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                    Products ({products?.length ?? "…"}) — lazy loaded
                  </h3>
                  <button
                    type="button"
                    onClick={() => void loadProducts()}
                    disabled={productsLoading}
                    className="text-[11px] font-bold text-emerald-700 hover:underline disabled:opacity-50"
                  >
                    {productsLoading ? "Loading…" : "Reload"}
                  </button>
                </div>
                {productsError && (
                  <p className="text-[11px] font-bold text-rose-600">{productsError}</p>
                )}
                {productsLoading && !products && (
                  <p className="text-[11px] text-slate-500">Loading products…</p>
                )}
                {products && products.length === 0 && (
                  <p className="text-[11px] text-slate-500">No products listed.</p>
                )}
                {products && products.length > 0 && (
                  <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {products.map((p) => (
                      <li key={p.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{p.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {p.brand} • {formatNaira(p.currentPrice)} • {p.stockQuantity} in stock
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleRemoveProduct(p.id, p.name)}
                          className="shrink-0 px-2 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-[11px] disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Messages with {store.name}
                </h3>
                <StoreMessageThread
                  storeId={store.id}
                  viewerRole="admin"
                  fetchMessages={fetchMessages}
                  sendMessage={sendMessage}
                />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function AdminView({
  customer,
  isAdmin,
  stores,
  pendingStores = [],
  orders,
  areas = STORE_AREAS,
  stats = null,
  filters = {},
}: AdminViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [area, setArea] = useState<Store["area"]>(areas[0] || "Central Area");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [openHours, setOpenHours] = useState("8:00 AM – 9:00 PM (Daily)");

  // Filter bar state, seeded from the URL search params the page received.
  const [from, setFrom] = useState(filters.from || "");
  const [to, setTo] = useState(filters.to || "");
  const [storeFilter, setStoreFilter] = useState(filters.storeId || "");
  const [areaFilter, setAreaFilter] = useState(filters.area || "");

  const applyFilters = (event?: React.FormEvent) => {
    event?.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (storeFilter) params.set("storeId", storeFilter);
    if (areaFilter) params.set("area", areaFilter);
    const query = params.toString();
    router.push(query ? `/admin?${query}` : "/admin");
    router.refresh();
  };

  const clearFilters = () => {
    setFrom("");
    setTo("");
    setStoreFilter("");
    setAreaFilter("");
    router.push("/admin");
    router.refresh();
  };

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

  const handleStatusChange = (storeId: string, newStatus: StoreStatus) => {
    setErrorMsg(null);
    setInfoMsg(null);
    startTransition(async () => {
      const res = await setStoreStatusAction(storeId, newStatus);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to update store status.");
        return;
      }
      setInfoMsg(`Store status updated to ${newStatus}.`);
      router.refresh();
    });
  };

  const refreshDesk = useCallback(() => {
    router.refresh();
  }, [router]);

  // Client-side mirror of the server filters so the visible order table matches
  // the stats aggregates (the desk list itself is unfiltered server-side).
  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      if (storeFilter) {
        const inStore =
          order.storeId === storeFilter ||
          order.items.some((item) => item.storeId === storeFilter);
        if (!inStore) return false;
      }
      if (areaFilter && order.storeArea !== areaFilter) return false;
      if (from && order.createdAt < new Date(from).toISOString()) return false;
      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        if (order.createdAt > endOfDay.toISOString()) return false;
      }
      return true;
    });
  }, [orders, storeFilter, areaFilter, from, to]);

  const ordersByStoreGroup = useMemo(() => {
    const groups = new Map<string, { name: string; area: string; orders: Order[] }>();
    for (const order of visibleOrders) {
      const key = order.storeId || order.storeName;
      const entry = groups.get(key) || {
        name: order.storeName,
        area: order.storeArea,
        orders: [],
      };
      entry.orders.push(order);
      groups.set(key, entry);
    }
    return [...groups.entries()].sort((a, b) => b[1].orders.length - a[1].orders.length);
  }, [visibleOrders]);

  const kpis = [
    { label: "Wallet total", value: stats ? formatNaira(stats.walletTotal) : "—" },
    { label: "Pending orders", value: stats ? String(stats.pendingOrders) : "—" },
    { label: "Confirmed orders", value: stats ? String(stats.confirmedOrders) : "—" },
    { label: "Pickup-fee total", value: stats ? formatNaira(stats.pickupFeeTotal) : "—" },
    { label: "Confirmed purchases", value: stats ? formatNaira(stats.confirmedPurchaseTotal) : "—" },
    { label: "Refunds", value: stats ? formatNaira(stats.refundTotal) : "—" },
    { label: "Confirmed items", value: stats ? String(stats.confirmedItemCount) : "—" },
    { label: "Unconfirmed items", value: stats ? String(stats.unconfirmedItemCount) : "—" },
    { label: "Commission (12%)", value: stats ? formatNaira(stats.commission) : "—" },
  ];

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
        {!isAdmin && (
          <AdminSignInForm signedInEmail={customer?.email} />
        )}

        {isAdmin && (
          <>
            {/* Pending Store Approvals Section */}
            {pendingStores.length > 0 && (
              <section className="rounded-3xl border border-amber-300 bg-amber-50/70 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-700" />
                    <h2 className="text-sm font-black uppercase tracking-wider text-amber-900">
                      Pending Store Registrations ({pendingStores.length})
                    </h2>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-800 px-2 py-0.5 rounded-md">
                    Review Required
                  </span>
                </div>
                <p className="text-xs text-amber-800/80">
                  These supermarkets submitted self-registration. Approve to publish to marketplace catalog and activate owner login.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-amber-900/60 uppercase tracking-wider">
                      <tr>
                        <th className="py-2 pr-3">Supermarket Name</th>
                        <th className="py-2 pr-3">Area</th>
                        <th className="py-2 pr-3">CAC / Type</th>
                        <th className="py-2 pr-3">Phone</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingStores.map((s) => (
                        <tr key={s.id} className="border-t border-amber-200/60">
                          <td className="py-3 pr-3 font-bold text-slate-900">
                            <div>{s.name}</div>
                            <div className="text-[11px] font-normal text-slate-500">{s.address}</div>
                          </td>
                          <td className="py-3 pr-3 text-slate-700 font-semibold">{s.area}</td>
                          <td className="py-3 pr-3 text-slate-600">
                            <div>{s.cacNumber || "No CAC provided"}</div>
                            <div className="text-[10px] uppercase text-slate-400 font-semibold">{s.storeType}</div>
                          </td>
                          <td className="py-3 pr-3 text-slate-700">{s.phone}</td>
                          <td className="py-3 text-right space-x-2">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleStatusChange(s.id, "approved")}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleStatusChange(s.id, "suspended")}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-rose-600 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* KPI cards */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider">
                Analytics {from || to ? `(${from || "…"} → ${to || "…"})` : "(all time)"}
              </h2>
              {!stats && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-bold">
                  Stats are unavailable right now — showing desk lists only.
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {kpis.map((kpi) => (
                  <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {kpi.label}
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-900">{kpi.value}</p>
                  </div>
                ))}
              </div>
              {stats && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
                      Orders by store
                    </h3>
                    {stats.ordersByStore.length === 0 ? (
                      <p className="text-xs text-slate-500">No orders in range.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 text-xs max-h-56 overflow-y-auto">
                        {stats.ordersByStore.map((row) => (
                          <li key={row.storeId} className="py-1.5 flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 truncate">
                              {row.storeName}{" "}
                              <span className="font-normal text-slate-400">({row.area})</span>
                            </span>
                            <span className="text-slate-600 whitespace-nowrap">
                              {row.orderCount} orders • {formatNaira(row.revenue)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
                      Orders by area
                    </h3>
                    {stats.ordersByArea.length === 0 ? (
                      <p className="text-xs text-slate-500">No orders in range.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 text-xs max-h-56 overflow-y-auto">
                        {stats.ordersByArea.map((row) => (
                          <li key={row.area || "unknown"} className="py-1.5 flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800">{row.area || "Unknown"}</span>
                            <span className="text-slate-600 whitespace-nowrap">
                              {row.orderCount} orders • {formatNaira(row.revenue)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Filter bar */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider">Filters</h2>
              <form onSubmit={applyFilters} className="grid sm:grid-cols-5 gap-3 items-end">
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>From</span>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>To</span>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>Store</span>
                  <select
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">All stores</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>Area</span>
                  <select
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">All areas</option>
                    {areas.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </section>

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
              <p className="text-xs text-slate-500">
                Expand a store to manage its products and message the store team. Toggling
                active only flips <code className="font-mono">is_active</code>; approval
                status stays separate.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Area</th>
                      <th className="py-2 pr-3">Deals</th>
                      <th className="py-2 pr-3">Active</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store) => (
                      <AdminStoreRow key={store.id} store={store} onChanged={refreshDesk} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-black uppercase tracking-wider">
                  All orders ({visibleOrders.length}
                  {visibleOrders.length !== orders.length ? ` of ${orders.length}` : ""})
                </h2>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                SG-XXXXX is the order label. The 4-digit PIN is for the attendant. Open the
                admin detail page for per-item decision timings.
              </p>
              {ordersByStoreGroup.length === 0 && (
                <p className="text-xs text-slate-500">No orders match these filters.</p>
              )}
              {ordersByStoreGroup.map(([storeId, group]) => (
                <div key={storeId} className="space-y-2">
                  <h3 className="text-xs font-black text-slate-800">
                    {group.name}{" "}
                    <span className="font-normal text-slate-400">
                      ({group.area} • {group.orders.length} orders)
                    </span>
                  </h3>
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-500 uppercase tracking-wider bg-slate-50">
                        <tr>
                          <th className="py-2 px-3">Order</th>
                          <th className="py-2 pr-3">Customer</th>
                          <th className="py-2 pr-3">Total</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3">PIN</th>
                          <th className="py-2 pr-3">Items</th>
                          <th className="py-2 px-3">Decided</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.orders.map((order) => {
                          const decidedCount = order.items.filter(
                            (item) => item.decidedAt || item.fulfillmentStatus !== "pending"
                          ).length;
                          return (
                            <tr key={order.id} className="border-t border-slate-100">
                              <td className="py-2 px-3 font-black text-slate-900">
                                <Link
                                  href={`/admin/orders/${order.id}`}
                                  className="hover:text-emerald-700"
                                >
                                  {order.id}
                                </Link>
                                <Link
                                  href={`/order/${order.id}`}
                                  className="block text-[10px] font-bold text-slate-400 hover:text-emerald-700"
                                >
                                  pickup pass →
                                </Link>
                              </td>
                              <td className="py-2 pr-3 text-slate-600">
                                <div className="font-bold text-slate-800">
                                  {order.customerName}
                                </div>
                                <div>{order.customerEmail}</div>
                              </td>
                              <td className="py-2 pr-3 font-bold">{formatNaira(order.total)}</td>
                              <td className="py-2 pr-3">{order.status.replaceAll("_", " ")}</td>
                              <td className="py-2 pr-3 font-mono font-bold">
                                {order.pickupVerificationCode}
                              </td>
                              <td className="py-2 pr-3 text-slate-600">
                                {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {decidedCount}/{order.items.length}
                                {order.items.some((item) => item.decidedAt) && (
                                  <span className="block text-[10px] text-slate-400">
                                    fastest {formatLatency(
                                      Math.min(
                                        ...order.items
                                          .map((item) =>
                                            decisionLatency(order.createdAt, item.decidedAt)
                                          )
                                          .filter((ms): ms is number => ms !== null)
                                      )
                                    )}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

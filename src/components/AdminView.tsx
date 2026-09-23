"use client";

import React, { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";import {
  ArrowLeft,
  Building2,
  ClipboardList,
  LogOut,
  MessageSquare,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { AdminSignInForm } from "@/components/AdminSignInForm";
import { DailyRevenueChart, RefundsChart, TopStoresChart } from "@/components/AdminCharts";
import { StoreMessageThread, ThreadMessage } from "@/components/StoreMessageThread";
import {
  createStoreAction,
  deleteProductAsAdmin,
  deleteStoreAsAdmin,
  getStoreThreadAction,
  getUnreadCountsAction,
  listStoreProductsAction,
  markItemRefundSentAction,
  markThreadReadAction,
  rejectItemRefundAction,
  sendAdminMessageAction,
  setStoreActiveAction,
  setStoreStatusAction,
} from "@/lib/admin";
import {
  enterAdminStoreViewAction,
  setAdminStoreViewPasswordAction,
} from "@/lib/store";
import { logout } from "@/lib/auth";
import { formatNaira } from "@/lib/pricing";
import { Customer, Order, Store, STORE_AREAS, StoreStatus } from "@/lib/types";
import type { AdminStats, AdminStatsFilters } from "@/lib/db/admin-stats";
import type { UnreadCounts } from "@/lib/db/messages";
import type { ManualItemRefund } from "@/lib/db/manual-refunds";
import type { StorePayout } from "@/lib/db/stores";

interface AdminViewProps {
  customer: Customer | null;
  isAdmin: boolean;
  stores: Store[];
  pendingStores?: Store[];
  orders: Order[];
  areas?: Store["area"][];
  stats?: AdminStats | null;
  filters?: AdminStatsFilters;
  pendingRefunds?: ManualItemRefund[];
  decidedRefunds?: ManualItemRefund[];
  payouts?: StorePayout[];
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
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    if (!confirmDelete) {
      // First click arms the inline confirm; second click runs the delete.
      setConfirmDelete(true);
      return;
    }
    setConfirmDelete(false);
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
          <button
            type="button"
            disabled={isPending}
            onClick={handleActiveToggle}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black disabled:opacity-50 ${
              store.isActive
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
            }`}
            title={store.isActive ? "Suspend this store" : "Re-activate this store"}
          >
            {store.isActive ? "Suspend" : "Activate"}
          </button>
          {confirmDelete ? (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] disabled:opacity-50"
              >
                Confirm delete?
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-[11px] disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-[11px] disabled:opacity-50"
            >
              Delete
            </button>
          )}
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
  pendingRefunds = [],
  decidedRefunds = [],
  payouts = [],
}: AdminViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"analytics" | "orders" | "stores" | "register" | "messages" | "refunds" | "payouts">("analytics");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [area, setArea] = useState<Store["area"]>(areas[0] || "Central Area");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [openHours, setOpenHours] = useState("8:00 AM – 9:00 PM (Daily)");
  const [storeViewId, setStoreViewId] = useState(stores[0]?.id || "");
  const [storeViewPassword, setStoreViewPassword] = useState("");
  const [storeViewMsg, setStoreViewMsg] = useState<string | null>(null);
  const [storeViewError, setStoreViewError] = useState<string | null>(null);
  // Per-store decision reason for pending approval Approve/Reject buttons.
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});

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

  const handleEnterStoreView = () => {
    setStoreViewMsg(null);
    setStoreViewError(null);
    if (!storeViewId) {
      setStoreViewError("Select a store first.");
      return;
    }
    if (!storeViewPassword) {
      setStoreViewError("Enter the admin store-view password.");
      return;
    }
    startTransition(async () => {
      const result = await enterAdminStoreViewAction(storeViewId, storeViewPassword);
      if (!result.success) {
        setStoreViewError(result.error || "Could not open the store view.");
        return;
      }
      setStoreViewMsg("Store view activated. Opening the selected store…");
      setStoreViewPassword("");
      router.push(`/store?storeId=${encodeURIComponent(storeViewId)}`);
      router.refresh();
    });
  };

  // Shared admin store-view secret rotation (lives in app_settings, not env).
  const [viewPasswordCurrent, setViewPasswordCurrent] = useState("");
  const [viewPasswordNew, setViewPasswordNew] = useState("");
  const [viewPasswordMsg, setViewPasswordMsg] = useState<string | null>(null);
  const [viewPasswordError, setViewPasswordError] = useState<string | null>(null);

  const handleRotateStoreViewPassword = (event: React.FormEvent) => {
    event.preventDefault();
    setViewPasswordMsg(null);
    setViewPasswordError(null);
    startTransition(async () => {
      const result = await setAdminStoreViewPasswordAction({
        currentPassword: viewPasswordCurrent,
        newPassword: viewPasswordNew,
      });
      if (!result.success) {
        setViewPasswordError(result.error || "Could not update the store-view password.");
        return;
      }
      setViewPasswordMsg("Store-view password updated. Use it for every store.");
      setViewPasswordCurrent("");
      setViewPasswordNew("");
    });
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

  const handleStatusChange = (storeId: string, newStatus: StoreStatus, reason?: string) => {
    setErrorMsg(null);
    setInfoMsg(null);
    startTransition(async () => {
      const res = await setStoreStatusAction(storeId, newStatus, reason);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to update store status.");
        return;
      }
      setInfoMsg(
        reason?.trim()
          ? `Store ${newStatus}. Reason sent to the store's Messages thread.`
          : `Store status updated to ${newStatus}.`
      );
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
      if (from && order.createdAt < `${from}T00:00:00.000Z`) return false;
      if (to && order.createdAt > `${to}T23:59:59.999Z`) return false;
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

  // Messages tab: unread badge polls every 5s; thread list sorted unread-first.
  const [unread, setUnread] = useState<UnreadCounts>({ perStore: [], total: 0 });
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = async () => {
      const result = await getUnreadCountsAction();
      if (!cancelled && result.success && result.counts) {
        setUnread(result.counts);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isAdmin]);

  const unreadByStore = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of unread.perStore) map.set(entry.storeId, entry.unread);
    return map;
  }, [unread]);

  const messageThreads = useMemo(() => {
    return [...stores]
      .map((store) => ({ store, unreadCount: unreadByStore.get(store.id) ?? 0 }))
      .sort((a, b) => b.unreadCount - a.unreadCount || a.store.name.localeCompare(b.store.name));
  }, [stores, unreadByStore]);

  const defaultThreadId =
    !activeThreadId && messageThreads.length > 0 ? messageThreads[0].store.id : null;
  const resolvedThreadId = activeThreadId || defaultThreadId;
  const activeThread = messageThreads.find((t) => t.store.id === resolvedThreadId) || null;

  const fetchActiveMessages = useCallback(async (): Promise<ThreadMessage[]> => {
    if (!resolvedThreadId) return [];
    const result = await getStoreThreadAction(resolvedThreadId);
    if (!result.success) {
      throw new Error(result.error || "Could not load messages.");
    }
    return (result.messages || []).map((m) => ({
      id: m.id,
      senderRole: m.senderRole,
      body: m.body,
      createdAt: m.createdAt,
    }));
  }, [resolvedThreadId]);

  const sendActiveMessage = useCallback(
    async (body: string) => {
      if (!resolvedThreadId) return { success: false, error: "Pick a store thread first." };
      return sendAdminMessageAction(resolvedThreadId, body);
    },
    [resolvedThreadId]
  );

  const openThread = (storeId: string) => {
    setActiveThreadId(storeId);
    void markThreadReadAction(storeId).then(() => {
      void getUnreadCountsAction().then((result) => {
        if (result.success && result.counts) setUnread(result.counts);
      });
    });
  };

  // Refunds tab: unavailable items queued after valid pickup PIN; admin pays manually.
  const [refundMsg, setRefundMsg] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundBusyId, setRefundBusyId] = useState<string | null>(null);
  const [history, setHistory] = useState<ManualItemRefund[]>(decidedRefunds);

  // Keep the history table in sync when the server payload refreshes.
  const historyKey = decidedRefunds.map((r) => r.id).join(",");
  const [historySeed, setHistorySeed] = useState(historyKey);
  if (historySeed !== historyKey) {
    setHistorySeed(historyKey);
    setHistory(decidedRefunds);
  }

  const runRefundOp = (id: string, op: () => Promise<{ success: boolean; error?: string }>, okMsg: string) => {
    setRefundMsg(null);
    setRefundError(null);
    setRefundBusyId(id);
    startTransition(async () => {
      try {
        const res = await op();
        if (!res.success) {
          setRefundError(res.error || "Refund action failed.");
          return;
        }
        setRefundMsg(okMsg);
        router.refresh();
      } finally {
        setRefundBusyId(null);
      }
    });
  };

  const handleMarkSent = (refund: ManualItemRefund) => {
    runRefundOp(refund.id, () => markItemRefundSentAction(refund.id), "Refund marked as sent.");
  };

  const handleReject = (refund: ManualItemRefund) => {
    runRefundOp(refund.id, () => rejectItemRefundAction(refund.id), "Refund rejected.");
  };

  const kpis = [
    { label: "Wallet total", value: stats ? formatNaira(stats.walletTotal) : "—", caption: "current total, not date-filtered" },
    { label: "Pending orders", value: stats ? String(stats.pendingOrders) : "—" },
    { label: "Confirmed orders", value: stats ? String(stats.confirmedOrders) : "—" },
    { label: "Pickup-fee total", value: stats ? formatNaira(stats.pickupFeeTotal) : "—" },
    { label: "Confirmed purchases", value: stats ? formatNaira(stats.confirmedPurchaseTotal) : "—" },
    { label: "Refunds", value: stats ? formatNaira(stats.refundTotal) : "—" },
    { label: "Confirmed items", value: stats ? String(stats.confirmedItemCount) : "—" },
    { label: "Unconfirmed items", value: stats ? String(stats.unconfirmedItemCount) : "—" },
    { label: "Commission (12%)", value: stats ? formatNaira(stats.commission) : "—" },
  ];

  // Static labels only: dynamic counts live inside each section so tab clicks
  // never remount the nav and the hydration tree stays stable.
  const tabs: { id: "analytics" | "orders" | "stores" | "register" | "messages" | "refunds" | "payouts"; label: string; badge?: number }[] = [
    { id: "analytics", label: "Analytics" },
    { id: "orders", label: "Orders" },
    { id: "stores", label: "Stores" },
    { id: "register", label: "Register Store" },
    { id: "messages", label: "Messages", badge: unread.total },
    { id: "refunds", label: "Refunds" },
    { id: "payouts", label: "Payouts" },
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
            <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-black uppercase tracking-wider">Switch to store view</h2>
                <span className="text-[11px] text-slate-400 font-semibold">
                  Exit is available inside the store portal after opening.
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Admin-only. Pick a store, enter the shared store-view password, then open that
                store portal. The same password works for every store and can be rotated below.
              </p>
              {storeViewMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  {storeViewMsg}
                </div>
              )}
              {storeViewError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {storeViewError}
                </div>
              )}
              <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>Store</span>
                  <select
                    value={storeViewId}
                    onChange={(e) => setStoreViewId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>Store-view password</span>
                  <input
                    type="password"
                    value={storeViewPassword}
                    onChange={(e) => setStoreViewPassword(e.target.value)}
                    placeholder="Admin store-view password"
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <button
                  type="button"
                  disabled={isPending || !storeViewId}
                  onClick={handleEnterStoreView}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
                >
                  {isPending ? "Opening…" : "Open store view"}
                </button>
              </div>

              <form
                onSubmit={handleRotateStoreViewPassword}
                className="mt-2 pt-3 border-t border-slate-100 grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end"
              >
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>Current store-view password</span>
                  <input
                    type="password"
                    value={viewPasswordCurrent}
                    onChange={(e) => setViewPasswordCurrent(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <label className="text-[11px] font-bold text-slate-500 space-y-1">
                  <span>New password (min 6 chars)</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={viewPasswordNew}
                    onChange={(e) => setViewPasswordNew(e.target.value)}
                    autoComplete="new-password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isPending || !viewPasswordNew}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-50"
                >
                  {isPending ? "Updating…" : "Rotate password"}
                </button>
                {viewPasswordMsg && (
                  <p className="sm:col-span-3 text-[11px] font-bold text-emerald-700">{viewPasswordMsg}</p>
                )}
                {viewPasswordError && (
                  <p className="sm:col-span-3 text-[11px] font-bold text-rose-600">{viewPasswordError}</p>
                )}
              </form>
            </section>

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
                        <tr key={s.id} className="border-t border-amber-200/60 align-top">
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
                          <td className="py-3 text-right space-y-2">
                            <input
                              type="text"
                              value={decisionReasons[s.id] || ""}
                              onChange={(e) =>
                                setDecisionReasons((current) => ({
                                  ...current,
                                  [s.id]: e.target.value,
                                }))
                              }
                              placeholder="Reason (sent to store Messages)"
                              maxLength={300}
                              className="w-full min-w-56 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 focus:border-amber-500 focus:outline-none"
                            />
                            <div className="space-x-2">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleStatusChange(s.id, "approved", decisionReasons[s.id])}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleStatusChange(s.id, "suspended", decisionReasons[s.id])}
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-rose-600 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Filter bar — above the tabs so it visibly drives Analytics + Orders */}
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

            {/* Tab navigation */}
            <nav className="flex flex-wrap gap-2" aria-label="Admin sections">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-colors ${
                    activeTab === tab.id
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {tab.label}
                  {typeof tab.badge === "number" && tab.badge > 0 && (
                    <span className="min-w-5 h-5 px-1 inline-flex items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-black">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Analytics tab: KPIs + charts */}
            {activeTab === "analytics" && (
            <section suppressHydrationWarning className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
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
                    {"caption" in kpi && kpi.caption && (
                      <p className="mt-0.5 text-[10px] text-slate-400 font-medium">{kpi.caption}</p>
                    )}
                  </div>
                ))}
              </div>
              {stats && (
                <>
                <div className="grid gap-4 md:grid-cols-2">
                  <DailyRevenueChart series={stats.dailySeries} formatNaira={formatNaira} />
                  <RefundsChart series={stats.dailySeries} formatNaira={formatNaira} />
                </div>
                <TopStoresChart stores={stats.ordersByStore} formatNaira={formatNaira} />
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
                </>
              )}
            </section>
            )}

            {activeTab === "register" && (
            <section suppressHydrationWarning className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
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
            )}

            {activeTab === "stores" && (
            <section suppressHydrationWarning className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
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
            )}

            {activeTab === "orders" && (
            <section suppressHydrationWarning className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
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
            )}

            {activeTab === "messages" && (
            <section suppressHydrationWarning className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-black uppercase tracking-wider">
                  Messages {unread.total > 0 ? `(${unread.total} unread)` : ""}
                </h2>
              </div>
              {messageThreads.length === 0 ? (
                <p className="text-xs text-slate-500">No stores to message yet.</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                  <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden max-h-96 overflow-y-auto">
                    {messageThreads.map(({ store, unreadCount }) => (
                      <li key={store.id}>
                        <button
                          type="button"
                          onClick={() => openThread(store.id)}
                          className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between gap-2 ${
                            activeThreadId === store.id ? "bg-emerald-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <span className="font-bold text-slate-800 truncate">{store.name}</span>
                          {unreadCount > 0 && (
                            <span className="shrink-0 min-w-5 h-5 px-1 inline-flex items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-black">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-2">
                    {activeThread ? (
                      <>
                        <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                          {activeThread.store.name}
                        </h3>
                        <StoreMessageThread
                          key={activeThread.store.id}
                          storeId={activeThread.store.id}
                          viewerRole="admin"
                          fetchMessages={fetchActiveMessages}
                          sendMessage={sendActiveMessage}
                        />
                      </>
                    ) : (
                      <p className="text-xs text-slate-500">Pick a store thread.</p>
                    )}
                  </div>
                </div>
              )}
            </section>
            )}

            {activeTab === "refunds" && (
            <section suppressHydrationWarning className="rounded-3xl border border-slate-200 bg-white p-6 space-y-6">
              <h2 className="text-sm font-black uppercase tracking-wider">
                Item refunds ({pendingRefunds.length} pending)
              </h2>
              <p className="text-xs text-slate-500">
                Only unavailable items are listed. Refund sends Paystack the amount of that item, not the rest of the original transfer. Paystack returns it to the account that paid.
              </p>
              {refundMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  {refundMsg}
                </div>
              )}
              {refundError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {refundError}
                </div>
              )}
              <div className="space-y-2">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Pending refunds
                </h3>
                {pendingRefunds.length === 0 ? (
                  <p className="text-xs text-slate-500">No pending item refunds.</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-500 uppercase tracking-wider bg-slate-50">
                        <tr>
                          <th className="py-2 px-3">Order / item</th>
                          <th className="py-2 pr-3">Customer</th>
                          <th className="py-2 pr-3">Amount</th>
                          <th className="py-2 pr-3">Bank / account</th>
                          <th className="py-2 pr-3">Finalized</th>
                          <th className="py-2 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingRefunds.map((refund) => {
                          const busy = refundBusyId === refund.id;
                          return (
                            <tr key={refund.id} className="border-t border-slate-100">
                              <td className="py-2 px-3">
                                <div className="font-bold text-slate-800">{refund.orderId}</div>
                                <div className="text-[10px] text-slate-500">{refund.productName} × {refund.quantity}</div>
                              </td>
                              <td className="py-2 pr-3">
                                <div className="font-bold text-slate-800">{refund.customerName || refund.accountName}</div>
                                <div className="text-[10px] text-slate-400">{new Date(refund.unavailableAt).toLocaleString("en-US")}</div>
                              </td>
                              <td className="py-2 pr-3 font-bold text-emerald-700">{formatNaira(refund.amount)}</td>
                              <td className="py-2 pr-3 text-slate-600">
                                <div className="font-bold">{refund.accountName}</div>
                                <div>{refund.bankName}</div>
                                <div className="font-mono">{refund.accountNumber}</div>
                                <div className="text-[10px] text-slate-400">Resolved: {refund.resolvedAccountName}</div>
                              </td>
                              <td className="py-2 pr-3 text-slate-600">{new Date(refund.pickupFinalizedAt).toLocaleString("en-US")}</td>
                              <td className="py-2 px-3 text-right space-x-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleMarkSent(refund)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] disabled:opacity-50"
                                >
                                  {busy ? "…" : "Refund item"}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleReject(refund)}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-[11px] disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Sent / rejected ({history.length})
                </h3>
                {history.length === 0 ? (
                  <p className="text-xs text-slate-500">No decided refunds yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-500 uppercase tracking-wider bg-slate-50">
                        <tr>
                          <th className="py-2 px-3">Order / item</th>
                          <th className="py-2 pr-3">Customer</th>
                          <th className="py-2 pr-3">Amount</th>
                          <th className="py-2 pr-3">Bank</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 px-3">Finalized</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((refund) => (
                          <tr key={refund.id} className="border-t border-slate-100">
                            <td className="py-2 px-3 font-bold text-slate-800">
                              <div>{refund.orderId}</div>
                              <div className="text-[10px] font-normal text-slate-500">{refund.productName} × {refund.quantity}</div>
                            </td>
                            <td className="py-2 pr-3 font-bold text-slate-800">
                              {refund.customerName || refund.accountName}
                            </td>
                            <td className="py-2 pr-3">{formatNaira(refund.amount)}</td>
                            <td className="py-2 pr-3 text-slate-600">
                              {refund.bankName} •• {refund.accountNumber.slice(-4)}
                            </td>
                            <td className="py-2 pr-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                  refund.status === "sent"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {refund.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {new Date(refund.pickupFinalizedAt).toLocaleString("en-US")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
            )}

            {activeTab === "payouts" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider">
                Store payouts ({payouts.length})
              </h2>
              <p className="text-xs text-slate-500">
                A withdrawal sends the net amount from the Stillgood Paystack balance to the store bank account. Pending means Paystack has the transfer and has not confirmed it yet. Completed updates when Paystack reports the transfer succeeded.
              </p>
              {payouts.length === 0 ? (
                <p className="text-xs text-slate-500">No store payout requests yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500 uppercase tracking-wider bg-slate-50">
                      <tr>
                        <th className="py-2 px-3">Store</th>
                        <th className="py-2 pr-3">Gross / fee / net</th>
                        <th className="py-2 pr-3">Bank</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 px-3">Requested</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((payout) => (
                        <tr key={payout.id} className="border-t border-slate-100">
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-800">{payout.storeName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{payout.transferCode || payout.id}</div>
                          </td>
                          <td className="py-2 pr-3">
                            <div className="font-bold text-slate-800">{formatNaira(payout.netAmount)} net</div>
                            <div className="text-[10px] text-slate-500">
                              {formatNaira(payout.grossAmount)} gross • {formatNaira(payout.feeAmount)} fee
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-slate-600">
                            <div className="font-bold">{payout.accountName || "—"}</div>
                            <div>{payout.bankName || "No bank on file"}</div>
                            <div className="font-mono">{payout.accountNumber || ""}</div>
                          </td>
                          <td className="py-2 pr-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                payout.status === "success"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : payout.status === "failed"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {payout.status === "success" ? "Completed" : payout.status === "failed" ? "Failed" : "Waiting on Paystack"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-500">
                            <div>{new Date(payout.createdAt).toLocaleString("en-US")}</div>
                            <div className="text-[10px]">Updated {new Date(payout.updatedAt).toLocaleString("en-US")}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

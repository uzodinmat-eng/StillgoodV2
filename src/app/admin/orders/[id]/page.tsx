import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { findOrderById } from "@/lib/db/orders";
import { findStoreById } from "@/lib/db/stores";
import { customerIsAdmin } from "@/lib/auth-utils";
import { getSession } from "@/lib/auth";
import { formatNaira } from "@/lib/pricing";
import { AdminSignInForm } from "@/components/AdminSignInForm";

export const dynamic = "force-dynamic";

function formatLatency(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "—";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function msBetween(from: string, to?: string): number | null {
  if (!to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getSession();
  const isAdmin = customerIsAdmin(customer);
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="bg-slate-900 text-white border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
              Stillgood ops
            </p>
            <h1 className="text-xl font-black tracking-tight">Admin order detail</h1>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <AdminSignInForm signedInEmail={customer?.email} />
        </main>
      </div>
    );
  }

  const order = await findOrderById(id);
  if (!order) {
    notFound();
  }

  const storeNames = new Map<string, string>();
  for (const fulfillment of order.fulfillments || []) {
    if (storeNames.has(fulfillment.storeId)) continue;
    const store = await findStoreById(fulfillment.storeId).catch(() => null);
    storeNames.set(fulfillment.storeId, store?.name || fulfillment.storeId);
  }
  for (const item of order.items) {
    if (!storeNames.has(item.storeId)) {
      const store = await findStoreById(item.storeId).catch(() => null);
      storeNames.set(item.storeId, store?.name || item.storeName || item.storeId);
    }
  }

  const itemStoreIds = [...new Set(order.items.map((item) => item.storeId))];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
              Stillgood ops
            </p>
            <h1 className="text-xl font-black tracking-tight">Order {order.id}</h1>
            <p className="text-xs text-slate-400">
              Placed {new Date(order.createdAt).toLocaleString()} • {order.status.replaceAll("_", " ")}
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white text-xs font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Admin desk
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <ShieldCheck className="w-4 h-4" />
            Admin-only detail with per-item and per-store decision timings
          </div>
          <div className="grid sm:grid-cols-3 gap-2 text-slate-600">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Customer</span>
              <span className="font-bold text-slate-800">{order.customerName}</span>
              <span className="block">{order.customerEmail} • {order.customerPhone}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Totals</span>
              <span className="font-bold text-slate-800">{formatNaira(order.total)}</span>
              <span className="block">
                Subtotal {formatNaira(order.subtotal)} • Pickup fee {formatNaira(order.pickupFee)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Pickup</span>
              <span className="font-bold text-slate-800">{order.pickupDate} • {order.pickupTimeSlot}</span>
              <span className="block">
                PIN <span className="font-mono font-black">{order.pickupVerificationCode}</span>
                {order.pickedUpAt ? ` • picked up ${new Date(order.pickedUpAt).toLocaleString()}` : ""}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider">
            Items ({order.items.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Decided at</th>
                  <th className="py-2 pr-3">Refunded at</th>
                  <th className="py-2">Decision latency</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => {
                  const latency = msBetween(order.createdAt, item.decidedAt);
                  return (
                    <tr key={`${item.productId}-${idx}`} className="border-t border-slate-100">
                      <td className="py-2 pr-3">
                        <div className="font-bold text-slate-800">{item.productName}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.brand} • {item.unit} • {item.storeName}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-bold">{item.quantity}</td>
                      <td className="py-2 pr-3 font-bold">{formatNaira(item.price * item.quantity)}</td>
                      <td className="py-2 pr-3">{(item.fulfillmentStatus || "pending").replaceAll("_", " ")}</td>
                      <td className="py-2 pr-3 text-slate-600">
                        {item.decidedAt ? new Date(item.decidedAt).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">
                        {item.refundedAt ? new Date(item.refundedAt).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 font-bold text-slate-800">
                        {item.decidedAt ? formatLatency(latency) : "awaiting decision"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider">
            Per-store decision & pickup state
          </h2>
          {(order.fulfillments || []).length === 0 && itemStoreIds.length === 0 && (
            <p className="text-xs text-slate-500">No store fulfillments recorded.</p>
          )}
          <div className="space-y-3">
            {(order.fulfillments || []).map((fulfillment) => {
              const decisionMs = msBetween(order.createdAt, fulfillment.confirmedAt);
              const items = order.items.filter((item) => item.storeId === fulfillment.storeId);
              const settled = Boolean(fulfillment.payoutReleasedAt);
              return (
                <div key={fulfillment.storeId} className="rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black text-slate-900">
                      {storeNames.get(fulfillment.storeId) || fulfillment.storeId}
                    </p>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {fulfillment.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-4 gap-2 text-slate-600">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">
                        Whole-order decision time
                      </span>
                      <span className="font-bold text-slate-800">
                        {fulfillment.confirmedAt
                          ? `${formatLatency(decisionMs)} (confirmed ${new Date(fulfillment.confirmedAt).toLocaleString()})`
                          : "awaiting store decision"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Pickup</span>
                      <span className="font-bold text-slate-800">
                        {fulfillment.pickedUpAt
                          ? `picked up ${new Date(fulfillment.pickedUpAt).toLocaleString()}`
                          : `PIN ${fulfillment.pickupCode} — not picked up`}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Settlement</span>
                      <span className="font-bold text-slate-800">
                        {settled
                          ? `released ${fulfillment.payoutReleasedAt ? new Date(fulfillment.payoutReleasedAt).toLocaleString() : ""}`
                          : "not yet released"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Subtotal</span>
                      <span className="font-bold text-slate-800">{formatNaira(fulfillment.subtotal)}</span>
                      <span className="block text-[11px] text-slate-500">
                        {items.length} item{items.length === 1 ? "" : "s"} from this store
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {(order.fulfillments || []).length === 0 &&
              itemStoreIds.map((storeId) => {
                const items = order.items.filter((item) => item.storeId === storeId);
                return (
                  <div key={storeId} className="rounded-2xl border border-slate-200 p-4 text-xs text-slate-600">
                    <p className="font-black text-slate-900">
                      {storeNames.get(storeId) || storeId}
                    </p>
                    <p>
                      No fulfillment row yet — {items.length} item{items.length === 1 ? "" : "s"} awaiting
                      the first store decision.
                    </p>
                  </div>
                );
              })}
          </div>
        </section>
      </main>
    </div>
  );
}

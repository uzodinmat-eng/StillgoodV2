"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  MapPin,
  Clock,
  CreditCard,
  Building2,
  Sparkles,
  ArrowRight,
  User,
  Truck,
} from "lucide-react";
import { CartSummary, Customer } from "@/lib/types";
import { formatNaira } from "@/lib/pricing";
import { createOrder } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { useStores } from "@/components/CatalogProvider";
import {
  addCalendarDays,
  autoAssignHubBatch,
  getAvailablePickupSlots,
  getLagosDateString,
  needsConsolidation,
  nextAvailablePickupDate,
  hubBatchLabel,
} from "@/lib/fulfillment";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartSummary: CartSummary;
  onOrderCreated?: (orderId: string) => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  cartSummary,
  onOrderCreated,
}: CheckoutModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stores = useStores();
  const consolidating = needsConsolidation(cartSummary.storesInvolved);
  const originStore = cartSummary.storesInvolved[0] || stores[0];
  const todayStr = getLagosDateString();

  const [storeId, setStoreId] = useState(originStore?.id || "");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [sessionCustomer, setSessionCustomer] = useState<Customer | null>(null);
  const [pickupDate, setPickupDate] = useState(() =>
    nextAvailablePickupDate(consolidating)
  );
  const [pickupTimeSlot, setPickupTimeSlot] = useState("4:00 PM – 7:00 PM");
  const [paymentMethod, setPaymentMethod] = useState<
    "paystack" | "flutterwave" | "bank_transfer" | "wallet"
  >("paystack");

  const availableSlots = useMemo(
    () =>
      getAvailablePickupSlots({
        consolidating,
        pickupDate,
      }),
    [consolidating, pickupDate]
  );

  useEffect(() => {
    if (!isOpen) return;

    if (!consolidating && originStore) {
      setStoreId(originStore.id);
    }

    if (consolidating) {
      // Hub and batch are assigned automatically: ordered at least 30
      // minutes before a batch's WAT cutoff lands in that batch.
      const assignment = autoAssignHubBatch();
      setStoreId(assignment.batch === "noon" ? "hub_noon" : "hub_evening");
      setPickupDate(assignment.pickupDate);
      setPickupTimeSlot(assignment.pickupTimeSlot);
      return;
    }

    const earliest = nextAvailablePickupDate(consolidating);
    setPickupDate((current) => (current < earliest ? earliest : current));

    getSession()
      .then((session) => {
        setSessionCustomer(session);
        if (session) {
          setCustomerName((current) => current || session.name);
          setCustomerEmail((current) => current || session.email);
          setCustomerPhone((current) => current || session.phone);
        } else {
          setCustomerName((current) => current || "Amina Bello");
          setCustomerEmail((current) => current || "amina.bello@example.ng");
          setCustomerPhone((current) => current || "+234 803 456 7890");
        }
      })
      .catch(() => setSessionCustomer(null));
  }, [isOpen, consolidating, originStore]);

  useEffect(() => {
    if (availableSlots.length === 0) {
      const tomorrow = addCalendarDays(getLagosDateString(), 1);
      if (pickupDate !== tomorrow) {
        setPickupDate(tomorrow);
      }
      return;
    }

    if (!availableSlots.some((slot) => slot.value === pickupTimeSlot)) {
      setPickupTimeSlot(availableSlots[0].value);
    }
  }, [availableSlots, pickupDate, pickupTimeSlot]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName || !customerPhone || !customerEmail) {
      setErrorMsg("Please provide your name, phone number, and email address.");
      return;
    }

    if (paymentMethod === "wallet") {
      if (!sessionCustomer) {
        setErrorMsg("Log in from the profile icon to pay with Stillgood Wallet.");
        return;
      }
      if (sessionCustomer.walletBalance < cartSummary.total) {
        setErrorMsg(
          `Wallet balance is ${formatNaira(sessionCustomer.walletBalance)}. Choose Paystack or transfer for this order.`
        );
        return;
      }
    }

    startTransition(async () => {
      const result = await createOrder({
        customerName,
        customerEmail,
        customerPhone,
        storeId,
        pickupDate,
        pickupTimeSlot,
        paymentMethod,
      });

      if (result.success && result.order) {
        if (onOrderCreated) onOrderCreated(result.order.id);
        if (result.checkoutUrl) {
          window.location.assign(result.checkoutUrl);
          return;
        }
        router.push(`/order/${result.order.id}`);
        onClose();
      } else {
        setErrorMsg(
          result.error || "Failed to confirm pickup reservation. Please try again."
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-auto flex flex-col max-h-[92vh]">
        <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-900 to-slate-900 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-bold mb-2.5">
            {consolidating ? (
              <Truck className="w-3.5 h-3.5" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            <span>
              {consolidating
                ? "Multi-Store Hub Consolidation"
                : "Direct Store Pickup"}
            </span>
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">
            Confirm & Reserve Order (SG-XXXXX)
          </h2>
          <p className="text-xs text-emerald-200/90 mt-0.5">
            {consolidating
              ? "Items from multiple stores will be batched to one hub for you or your dispatch rider."
              : "Collect at the supermarket that holds your reserved items."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>
                {consolidating
                  ? "1. Destination Pickup Hub"
                  : "1. Pickup Location"}
              </span>
            </label>

            {consolidating ? (
              <>
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-[11px] text-emerald-950 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Consolidation required</span>
                  </div>
                  <p className="leading-relaxed">
                    Your basket has items from{" "}
                    <strong>
                      {cartSummary.storesInvolved
                        .map((store) => store.name)
                        .join(", ")}
                    </strong>
                    . Your order will be batched automatically to the central
                    pickup hub — you will collect everything in one stop.
                  </p>
                </div>

                <div className="p-3 rounded-2xl border border-emerald-400 bg-emerald-50 ring-2 ring-emerald-500/20">
                  <p className="text-xs font-bold text-slate-900">
                    Stillgood Central Pickup Hub
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Assigned automatically based on when you order.
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-700 mt-1">
                    {hubBatchLabel(
                      pickupTimeSlot.includes("1:00 PM")
                        ? "noon"
                        : "evening"
                    )}{" "}
                    · Collection {pickupDate}
                  </p>
                </div>
              </>
            ) : (
              <div className="p-3 rounded-2xl border border-emerald-400 bg-emerald-50 ring-2 ring-emerald-500/20">
                <p className="text-xs font-bold text-slate-900">
                  {originStore?.name || "Pickup store"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {originStore
                    ? `${originStore.address} (${originStore.area})`
                    : "Select a partner supermarket"}
                </p>
                {originStore && (
                  <p className="text-[10px] font-semibold text-emerald-700 mt-1">
                    Direct pickup · {originStore.openHours}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>
                {consolidating
                  ? "2. Consolidation Batch & Pickup Window"
                  : "2. Pickup Date & Time Window"}
              </span>
            </label>

            {consolidating && (
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                Your batch is assigned automatically: order at least 30 minutes
                before the batch cutoff (Lagos time) and it arrives at the hub
                in that batch&apos;s window. Otherwise it rolls to the next
                batch.
              </p>
            )}

            {consolidating ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Collection Date
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={pickupDate}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Batch Window
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={pickupTimeSlot}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Collection Date
                  </label>
                  <input
                    type="date"
                    value={pickupDate}
                    min={todayStr}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Time Window
                  </label>
                  <select
                    value={pickupTimeSlot}
                    onChange={(e) => setPickupTimeSlot(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {availableSlots.map((slot) => (
                      <option key={`${slot.hubBatch ?? "direct"}-${slot.value}`} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              <span>3. Customer Contact (For SMS / Pickup Verification)</span>
            </label>

            {sessionCustomer ? (
              <p className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                Logged in as {sessionCustomer.name}
                {sessionCustomer.email ? ` (${sessionCustomer.email})` : ""}
                . This order will appear on your account as SG-XXXXX.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 font-medium">
                Guest checkout. Use the same email when you log in later if you want this order on your account.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Amina Bello"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  WhatsApp / Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+234 803 123 4567"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Email Address (for order receipt)
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>4. Nigerian Payment Rail</span>
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: "paystack", name: "Paystack", desc: "Cards, USSD, Transfer", icon: "💳" },
                { id: "flutterwave", name: "Flutterwave", desc: "Barter, Verve, Visa", icon: "🦋" },
                { id: "bank_transfer", name: "Direct Bank Transfer", desc: "Moniepoint / OPay", icon: "🏦" },
                { id: "wallet", name: "Stillgood Wallet", desc: sessionCustomer ? `Balance ${formatNaira(sessionCustomer.walletBalance)}` : "Log in required", icon: "⚡" },
              ].map((m) => {
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setPaymentMethod(
                        m.id as "paystack" | "flutterwave" | "bank_transfer" | "wallet"
                      )
                    }
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{m.icon}</span>
                      <span className="text-xs font-black text-slate-900">{m.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Items Total ({cartSummary.itemCount} items)</span>
              <span>{formatNaira(cartSummary.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{consolidating ? "Multi-store pickup & handling fee" : "Pickup & handling fee"}</span>
              <span>{formatNaira(cartSummary.pickupFee)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Total Markdown Savings</span>
              <span>-{formatNaira(cartSummary.savingsTotal)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
              <span>Amount Due</span>
              <span className="text-emerald-700">{formatNaira(cartSummary.total)}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending || availableSlots.length === 0}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-xl shadow-emerald-700/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating SG-XXXXX Pickup Code...</span>
                </>
              ) : (
                <>
                  <span>Confirm Reservation ({formatNaira(cartSummary.total)})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

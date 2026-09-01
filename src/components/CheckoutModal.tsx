"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  X, 
  MapPin, 
  Calendar, 
  Clock, 
  CreditCard, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Wallet,
  Phone,
  User,
  Mail
} from "lucide-react";
import { CartSummary, Store } from "@/lib/types";
import { formatNaira } from "@/lib/pricing";
import { createOrder } from "@/lib/actions";
import { STORES } from "@/lib/data";

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

  // Form State
  const defaultStore = cartSummary.storesInvolved[0] || STORES[0];
  const [storeId, setStoreId] = useState(defaultStore ? defaultStore.id : STORES[0].id);
  const [customerName, setCustomerName] = useState("Amina Bello");
  const [customerEmail, setCustomerEmail] = useState("amina.bello@example.ng");
  const [customerPhone, setCustomerPhone] = useState("+234 803 456 7890");
  
  // Date & Slot
  const todayStr = new Date().toISOString().split("T")[0];
  const [pickupDate, setPickupDate] = useState(todayStr);
  const [pickupTimeSlot, setPickupTimeSlot] = useState("4:00 PM – 7:00 PM");
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "flutterwave" | "bank_transfer" | "wallet">("paystack");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName || !customerPhone || !customerEmail) {
      setErrorMsg("Please provide your name, phone number, and email address.");
      return;
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
        router.push(`/order/${result.order.id}`);
        onClose();
      } else {
        setErrorMsg(result.error || "Failed to confirm pickup reservation. Please try again.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-900 to-slate-900 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-bold mb-2.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>Abuja In-Store Pickup Scheduling</span>
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">
            Confirm & Reserve Order (SG-XXXXX)
          </h2>
          <p className="text-xs text-emerald-200/90 mt-0.5">
            Collect fresh groceries at your selected supermarket counter.
          </p>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Pickup Store Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>1. Verified Abuja Pickup Location</span>
            </label>
            <div className="space-y-2">
              {STORES.map((s) => {
                const isSelected = storeId === s.id;
                return (
                  <label
                    key={s.id}
                    className={`flex items-start justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="storeId"
                        value={s.id}
                        checked={isSelected}
                        onChange={() => setStoreId(s.id)}
                        className="mt-1 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{s.name}</p>
                        <p className="text-[11px] text-slate-500">{s.address} ({s.area})</p>
                        <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                          ⏰ {s.openHours}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                        Selected
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Pickup Date & Time Window */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>2. Pickup Date & Time Window</span>
            </label>
            
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
                  <option value="10:00 AM – 1:00 PM">Morning: 10:00 AM – 1:00 PM</option>
                  <option value="1:00 PM – 4:00 PM">Afternoon: 1:00 PM – 4:00 PM</option>
                  <option value="4:00 PM – 7:00 PM">Evening: 4:00 PM – 7:00 PM</option>
                  <option value="7:00 PM – 9:00 PM">Late Evening: 7:00 PM – 9:00 PM</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              <span>3. Customer Contact (For SMS / Pickup Verification)</span>
            </label>
            
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

          {/* Payment Method Selection */}
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
                { id: "wallet", name: "Stillgood Wallet", desc: "Instant Escrow Pass", icon: "⚡" },
              ].map((m) => {
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
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

          {/* Price Breakdown Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Items Total ({cartSummary.itemCount} items)</span>
              <span>{formatNaira(cartSummary.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Platform Verification Fee</span>
              <span>{formatNaira(cartSummary.platformFee)}</span>
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

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
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

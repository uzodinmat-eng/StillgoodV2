"use client";

import React from "react";
import { 
  X, 
  TrendingDown, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ArrowRight 
} from "lucide-react";
import { Product } from "@/lib/types";
import { formatNaira, getUrgencyBadge } from "@/lib/pricing";

interface DriftPricingModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DriftPricingModal({
  product,
  isOpen,
  onClose,
}: DriftPricingModalProps) {
  if (!isOpen || !product) return null;

  const urgency = getUrgencyBadge(product.daysRemaining, product.dateType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-900 to-slate-900 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-bold mb-3">
            <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
            <span>Stillgood Dynamic Price Decay</span>
          </div>

          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
            Weekly 2.5% Drift Pricing Schedule
          </h2>
          <p className="text-xs text-emerald-200/90 mt-1">
            {product.brand} • {product.name}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Explanation Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>How Stillgood Drift Pricing Works</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-medium">
              To guarantee zero retail food waste across Abuja, verified stores list products at an initial base discount. For every week the item remains in stock, the price drops by an additional <strong className="text-emerald-700 font-bold">2.5% automatically</strong> until sold or reaching its safety cutoff date.
            </p>
          </div>

          {/* Product Date & Expiry Urgency Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-400 uppercase">
                {product.dateType === "best_before" ? "Best-Before Date" : "Expiry Date"}
              </p>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {new Date(product.expiryDate).toLocaleDateString("en-NG", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-[11px] font-bold text-amber-700 mt-1">
                {product.daysRemaining} days remaining
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-400 uppercase">
                Original Retail Price
              </p>
              <p className="text-sm font-bold text-slate-500 line-through mt-0.5">
                {formatNaira(product.originalPrice)}
              </p>
              <p className="text-xs font-black text-emerald-700 mt-1">
                Now {formatNaira(product.currentPrice)} (-{product.discountPercent}%)
              </p>
            </div>
          </div>

          {/* Timeline Table of Price Drops */}
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
              Price Drift Timeline
            </h4>
            <div className="space-y-2">
              {product.driftSchedule?.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    step.isCurrent
                      ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                      : step.isPast
                      ? "bg-slate-50/70 border-slate-200 opacity-60"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        step.isCurrent
                          ? "bg-emerald-600 text-white"
                          : step.isPast
                          ? "bg-slate-300 text-slate-700"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{step.label}</span>
                        {step.isCurrent && (
                          <span className="bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-md">
                            ACTIVE PRICE
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">{step.date}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-slate-900">
                      {formatNaira(step.price)}
                    </div>
                    <span className="text-[11px] font-bold text-rose-600">
                      -{step.discountPercent}% Off
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Food Safety & Pickup Reassurance */}
          <div className="p-3.5 rounded-2xl bg-emerald-950 text-white flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-emerald-100">Stillgood Quality Inspection Guarantee</p>
              <p className="text-emerald-300/80 mt-0.5 font-medium leading-relaxed">
                All items are sealed and inspected by store staff prior to customer pickup handoff. If not 100% satisfied during in-store pickup, get an instant refund.
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Got It, Close
          </button>
        </div>

      </div>

    </div>
  );
}

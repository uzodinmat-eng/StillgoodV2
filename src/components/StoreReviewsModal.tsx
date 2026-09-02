"use client";

import React from "react";
import { X, Star, ShieldCheck, CheckCircle2, User, Bike } from "lucide-react";
import { Store } from "@/lib/types";
import { getStoreReviews } from "@/lib/data";

interface StoreReviewsModalProps {
  store: Store | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StoreReviewsModal({
  store,
  isOpen,
  onClose,
}: StoreReviewsModalProps) {
  if (!isOpen || !store) return null;

  const reviewData = getStoreReviews(store.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-auto flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-900 to-slate-900 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-bold mb-2">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Verified Customer & Rider Ratings</span>
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">
            {store.name}
          </h2>
          <p className="text-xs text-emerald-200/90 mt-0.5">
            {store.area} • {store.rating} Star Average ({store.reviewCount} reviews)
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Rating Breakdown Badges */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Food Freshness
              </span>
              <span className="text-base font-black text-slate-900 mt-0.5 block">
                {reviewData.freshnessScore} / 5.0
              </span>
              <span className="text-[10px] text-emerald-700 font-bold">100% Sealed</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Handoff Speed
              </span>
              <span className="text-base font-black text-slate-900 mt-0.5 block">
                {reviewData.handoffSpeedScore} / 5.0
              </span>
              <span className="text-[10px] text-emerald-700 font-bold">&lt; 1 min PIN check</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Cleanliness
              </span>
              <span className="text-base font-black text-slate-900 mt-0.5 block">
                {reviewData.cleanlinessScore} / 5.0
              </span>
              <span className="text-[10px] text-emerald-700 font-bold">Cold-Chain Verified</span>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Recent Verified Handoff Feedback
            </h3>

            <div className="space-y-3">
              {reviewData.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                        {rev.userType === "Dispatch Rider" ? (
                          <Bike className="w-3.5 h-3.5" />
                        ) : (
                          <User className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{rev.customerName}</span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded-md">
                            {rev.userType}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400">{rev.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < Math.floor(rev.rating)
                              ? "fill-amber-400"
                              : "text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified SG-XXXXX Pickup</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Close Reviews
          </button>
        </div>

      </div>

    </div>
  );
}

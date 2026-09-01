"use client";

import React from "react";
import Link from "next/link";
import { 
  Sparkles, 
  TrendingDown, 
  ShieldCheck, 
  Heart, 
  ArrowLeft, 
  Layers, 
  CheckCircle2, 
  MapPin, 
  Building2 
} from "lucide-react";
import { formatNaira } from "@/lib/pricing";

export default function ImpactPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white pb-16">
      
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-emerald-900/50">
        <div className="max-w-4xl mx-auto space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Stillgood Marketplace</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>COMMUNITY & ENVIRONMENTAL IMPACT</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Fighting Grocery Inflation & Retail Food Waste in Abuja
          </h1>
          <p className="text-sm sm:text-base text-emerald-200/80 font-medium leading-relaxed max-w-2xl">
            Across Nigerian cities, tons of safe, packaged food is discarded weekly due to rigid supermarket rotation schedules. Stillgood connects conscious shoppers directly to surplus stock.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        
        {/* Core Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Consumer Savings
            </span>
            <p className="text-3xl font-black text-emerald-700">
              ₦4,850,000+
            </p>
            <p className="text-xs text-slate-500 font-medium pt-1">
              Direct cash saved by Abuja households.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Food Rescued From Landfill
            </span>
            <p className="text-3xl font-black text-slate-900">
              3,420 kg
            </p>
            <p className="text-xs text-slate-500 font-medium pt-1">
              Dairy, grains, canned food, and beverages.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Abuja Orders Completed
            </span>
            <p className="text-3xl font-black text-amber-600">
              1,280+
            </p>
            <p className="text-xs text-slate-500 font-medium pt-1">
              Seamless in-store pickup verifications.
            </p>
          </div>
        </div>

        {/* NAFDAC Safety Explainer */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Understanding Dates: Best-Before vs. Expiration
              </h2>
              <p className="text-xs text-slate-500">
                How Stillgood ensures safety and regulatory standards.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
              <h3 className="font-bold text-emerald-950 text-sm">
                &ldquo;Best Before&rdquo; (Quality Indicator)
              </h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                Applies to dry goods, canned food, cereal, and coffee. Indicates when the product is at peak freshness and flavor. Food remains 100% safe to eat after this date.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2">
              <h3 className="font-bold text-amber-950 text-sm">
                &ldquo;Use By / Expiry&rdquo; (Safety Cutoff)
              </h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                Applies to highly perishable foods like chilled dairy and meats. Stillgood removes all items 24 to 48 hours prior to this date to ensure customer safety.
              </p>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-700/20 transition-all"
          >
            <span>Start Rescuing Groceries in Abuja</span>
          </Link>
        </div>

      </main>

    </div>
  );
}

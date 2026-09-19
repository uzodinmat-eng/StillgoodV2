"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingDown,
  ShieldCheck,
  Store,
  ArrowRight,
  Bike,
} from "lucide-react";

interface HeroBannerProps {
  onExploreDeals: () => void;
}

/**
 * Typewriter "Save Big in <location>" — types one word, holds it 5 seconds,
 * deletes it, then moves to the next. Cycles Nigeria -> Lagos -> Abuja ->
 * Nigeria forever. SSR renders the first word (Nigeria) so there is no
 * hydration mismatch.
 */
const LOCATIONS = ["Nigeria", "Lagos", "Abuja"];
const HOLD_MS = 5000;
const TYPE_MS = 70;
const DELETE_MS = 35;

function RotatingLocation() {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("Nigeria");
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">("holding");

  useEffect(() => {
    const word = LOCATIONS[wordIndex % LOCATIONS.length];

    if (phase === "typing") {
      if (text.length < word.length) {
        const timer = setTimeout(() => setText(word.slice(0, text.length + 1)), TYPE_MS);
        return () => clearTimeout(timer);
      }
      // Typing finished: start holding after a beat. Using setTimeout keeps
      // every setState out of the synchronous effect body.
      const timer = setTimeout(() => setPhase("holding"), TYPE_MS);
      return () => clearTimeout(timer);
    }

    if (phase === "holding") {
      const timer = setTimeout(() => setPhase("deleting"), HOLD_MS);
      return () => clearTimeout(timer);
    }

    // deleting
    if (text.length > 0) {
      const timer = setTimeout(() => setText(text.slice(0, -1)), DELETE_MS);
      return () => clearTimeout(timer);
    }
    // Deleted to empty: advance to the next word via a timeout so the setState
    // calls happen after the effect body returns.
    const timer = setTimeout(() => {
      setWordIndex((wordIndex + 1) % LOCATIONS.length);
      setPhase("typing");
    }, DELETE_MS);
    return () => clearTimeout(timer);
  }, [phase, text, wordIndex]);

  return (
    <span
      className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300"
      aria-label={`Save Big in ${text}`}
    >
      {text}
    </span>
  );
}

export function HeroBanner({ onExploreDeals }: HeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white p-6 sm:p-10 lg:p-12 border border-emerald-800/40 shadow-2xl mb-8">
      
      {/* Decorative Glows */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl space-y-6">
        
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Stillgood Marketplace</span>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-black">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Weekly Dynamic Price Drift</span>
          </div>
        </div>

        {/* Main Headline */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Rescue Groceries. <br />
            Save Big in <RotatingLocation />.
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-emerald-100/90 font-medium max-w-2xl leading-relaxed">
            Order online and pick up at the store or send a dispatch rider.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onExploreDeals}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all cursor-pointer hover:scale-102 active:scale-98"
          >
            <span>Shop Today&apos;s Rescue Deals</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <Link
            href="/stores"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm px-5 py-3.5 rounded-2xl border border-white/10 transition-all"
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span>View Partner Stores</span>
          </Link>
        </div>

        {/* 3 Core Trust Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Store & Rider Pickup</p>
              <p className="text-[11px] text-emerald-200/70">Pick up or send any dispatch rider</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Weekly Drift</p>
              <p className="text-[11px] text-amber-200/70">Prices drop every 7 days</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">100% Food Inspected</p>
              <p className="text-[11px] text-teal-200/70">Verified condition & seals</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

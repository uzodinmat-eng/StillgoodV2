"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle2, ShieldCheck, Sparkles, Store as StoreIcon } from "lucide-react";
import { registerStoreAction } from "@/lib/store-auth";
import { Store, STORE_AREAS } from "@/lib/types";

export function StoreRegisterView() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [businessName, setBusinessName] = useState("");
  const [area, setArea] = useState<Store["area"]>("Wuse II");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [cacNumber, setCacNumber] = useState("");
  const [storeType, setStoreType] = useState("supermarket");
  const [openHours, setOpenHours] = useState("8:00 AM – 9:00 PM (Daily)");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const result = await registerStoreAction({
        businessName,
        area,
        address,
        phone,
        email,
        password,
        ownerName,
        cacNumber,
        storeType,
        openHours,
      });

      if (!result.success) {
        setErrorMsg(result.error || "Failed to register store.");
        return;
      }

      setSubmitted(true);
      setSuccessMsg(result.message || "Registration submitted successfully!");
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-emerald-900/50">
        <div className="max-w-3xl mx-auto space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketplace</span>
          </Link>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Merchant Onboarding • Abuja</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Register Your Supermarket
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed font-medium">
            Join verified Abuja retailers turning short-dated stock into recovered revenue. Once submitted, Stillgood admin will review and approve your store profile.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {submitted ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Registration Submitted</h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {successMsg}
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-600 space-y-2 max-w-md mx-auto">
              <p className="font-bold text-slate-800">What happens next:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>Admin verifies your supermarket details.</li>
                <li>Upon approval, your login is active at <Link href="/store" className="text-emerald-600 font-bold underline">/store</Link>.</li>
                <li>You can start uploading near-expiry inventory immediately.</li>
              </ul>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/store"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
              >
                Go to Store Login
              </Link>
              <Link
                href="/"
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              {/* Section 1: Business Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    1. Supermarket / Store Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Business / Store Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Grand Square Supermarket & Bakery"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Abuja Area / District *
                    </label>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value as Store["area"])}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                    >
                      {STORE_AREAS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Store Type
                    </label>
                    <select
                      value={storeType}
                      onChange={(e) => setStoreType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                    >
                      <option value="supermarket">Supermarket</option>
                      <option value="bakery_grocery">Bakery & Grocery</option>
                      <option value="pharmacy_mart">Pharmacy & Mart</option>
                      <option value="mega_store">Mega Cash & Carry</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Physical Store Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Plot 272, Central Business District, Mohammadu Buhari Way, Abuja"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      CAC Registration Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={cacNumber}
                      onChange={(e) => setCacNumber(e.target.value)}
                      placeholder="e.g. RC 1234567"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Operating Hours
                    </label>
                    <input
                      type="text"
                      value={openHours}
                      onChange={(e) => setOpenHours(e.target.value)}
                      placeholder="8:00 AM – 9:00 PM (Daily)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Owner Login & Account */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    2. Owner / Manager Account
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Owner / Manager Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Aliko Mohammed"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Contact WhatsApp / Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0803 123 4567"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Login Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="manager@store.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Account Password * (min. 6 characters)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a secure password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[11px] text-slate-500">
                  Already registered?{" "}
                  <Link href="/store" className="text-emerald-600 font-bold hover:underline">
                    Log in to Store Portal
                  </Link>
                </p>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-700/20 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {isPending ? "Submitting Registration…" : "Submit Store for Review"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

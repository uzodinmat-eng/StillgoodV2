import React from "react";
import Link from "next/link";
import { Sparkles, MapPin, ShieldCheck, Heart, Store } from "lucide-react";
import { STORES } from "@/lib/data";

export function Footer() {
  return (
    <footer className="mt-auto bg-slate-900 text-slate-300 border-t border-slate-800">
      
      {/* Top Banner */}
      <div className="bg-emerald-950/60 border-b border-emerald-900/40 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black">
              SG
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wider">
                Stillgood Abuja Marketplace
              </p>
              <p className="text-[11px] text-emerald-200/80">
                Rescuing short-dated groceries across the Federal Capital Territory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>NAFDAC Date Guidelines</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Abuja Verified Hubs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
        
        {/* Col 1 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm">
              SG
            </div>
            <span className="text-base font-black text-white">Stillgood</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Nigeria&apos;s pioneering marketplace dedicated to eliminating retail food waste in Abuja. Premium surplus food at fair, decaying prices.
          </p>
          <div className="pt-1 text-[11px] text-emerald-400 font-bold">
            Order Format: SG-XXXXX (Verified Pickup)
          </div>
        </div>

        {/* Col 2 */}
        <div className="space-y-2.5">
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
            Verified Abuja Hubs
          </h4>
          <ul className="space-y-1.5 text-slate-400">
            {STORES.map((s) => (
              <li key={s.id}>
                <Link href={`/stores/${s.slug}`} className="hover:text-emerald-400 transition-colors">
                  {s.name} ({s.area})
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 */}
        <div className="space-y-2.5">
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
            How It Works
          </h4>
          <ul className="space-y-1.5 text-slate-400">
            <li>
              <Link href="/#drift-pricing" className="hover:text-emerald-400 transition-colors">
                2.5% Weekly Drift Pricing
              </Link>
            </li>
            <li>
              <Link href="/impact" className="hover:text-emerald-400 transition-colors">
                Food Rescue Impact Tracker
              </Link>
            </li>
            <li>
              <Link href="/stores" className="hover:text-emerald-400 transition-colors">
                In-Store Pickup Safety Policy
              </Link>
            </li>
            <li>
              <span className="text-slate-500">Merchant POS Portal (Coming Soon)</span>
            </li>
          </ul>
        </div>

        {/* Col 4 */}
        <div className="space-y-2.5">
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
            Abuja Support & Safety
          </h4>
          <p className="text-slate-400">
            Have questions about an order or want to register an Abuja supermarket?
          </p>
          <p className="text-emerald-400 font-bold">
            📞 +234 800 STILLGOOD (784554)
          </p>
          <p className="text-slate-400">
            ✉️ hello@stillgood.ng
          </p>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800 py-6 px-4 text-center text-xs text-slate-500">
        <p>
          © {new Date().getFullYear()} Stillgood Nigeria. Made with care for Abuja households and zero food waste.
        </p>
      </div>

    </footer>
  );
}

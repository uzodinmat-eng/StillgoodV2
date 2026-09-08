"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  MapPin, 
  TrendingDown, 
  Store as StoreIcon, 
  CheckCircle2,
  Menu,
  X,
  User,
  ChevronDown
} from "lucide-react";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { useStores } from "@/components/CatalogProvider";
import { formatNaira } from "@/lib/pricing";
import { getSession } from "@/lib/auth";
import { Customer } from "@/lib/types";

interface NavbarProps {
  cartItemCount: number;
  cartSubtotal: number;
  onOpenCart: () => void;
  selectedStoreId?: string;
  onSelectStore?: (storeId: string) => void;
  walletBalance?: number;
}

export function Navbar({
  cartItemCount,
  cartSubtotal,
  onOpenCart,
  selectedStoreId = "all",
  onSelectStore,
  walletBalance = 0,
}: NavbarProps) {
  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const stores = useStores();
  const currentStore = stores.find((s) => s.id === selectedStoreId);

  useEffect(() => {
    getSession().then((session) => setCustomer(session)).catch(() => setCustomer(null));
  }, []);

  return (
    <>
      {/* Top Notification Announcement Bar */}
      <div className="bg-emerald-950 text-emerald-100 text-xs sm:text-sm py-2 px-4 font-medium border-b border-emerald-900/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="hidden sm:inline text-emerald-200">
              Order online and pick up at the store or send a dispatch rider.
            </span>
            <span className="sm:hidden text-emerald-200">
              Grocery Rescue • Store & Rider Pickup
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-300">
              <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline text-emerald-200">Dynamic Pricing:</span>
              <span className="font-semibold text-amber-300">Drops Weekly</span>
            </div>
            <Link
              href="/stores"
              className="text-emerald-300 hover:text-white underline underline-offset-2 hidden md:inline"
            >
              Partner Stores
            </Link>
            <Link
              href="/store"
              className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-600 transition-colors hidden sm:inline"
            >
              Store Login
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 gap-3 sm:gap-6">
            
            {/* Logo & City Selector */}
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/" className="flex items-center gap-2 group shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
                  <span className="font-black text-xl tracking-tighter">SG</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Stillgood
                  </span>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-600 -mt-1">
                    Marketplace
                  </span>
                </div>
              </Link>

              {/* City Selector Pill with Lagos Disabled Option */}
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setIsCityMenuOpen(!isCityMenuOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Abuja</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isCityMenuOpen && (
                  <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Select Location
                      </p>
                    </div>
                    <div className="p-1.5 space-y-1">
                      <button
                        onClick={() => setIsCityMenuOpen(false)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl bg-emerald-50 text-emerald-900 font-bold text-left"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Abuja (Active - 6 Hubs)</span>
                        </div>
                      </button>

                      <div
                        className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-slate-400 font-semibold cursor-not-allowed bg-slate-50/50 opacity-60"
                        title="Lagos marketplace launch in progress"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>Lagos</span>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                          Coming Soon
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Store Selector Pill (Desktop) */}
              <div className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs"
                >
                  <StoreIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate max-w-[170px]">
                    {currentStore ? currentStore.name : "All Partner Stores"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isStoreMenuOpen && (
                  <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Choose Supermarket
                      </p>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
                      <button
                        onClick={() => {
                          if (onSelectStore) onSelectStore("all");
                          setIsStoreMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-left font-medium transition-colors ${
                          selectedStoreId === "all"
                            ? "bg-emerald-50 text-emerald-900 font-bold"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <StoreIcon className="w-4 h-4 text-emerald-600" />
                          <span>All Partner Stores</span>
                        </div>
                        {selectedStoreId === "all" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>

                      {stores.map((store) => (
                        <button
                          key={store.id}
                          onClick={() => {
                            if (onSelectStore) onSelectStore(store.id);
                            setIsStoreMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-left transition-colors ${
                            selectedStoreId === store.id
                              ? "bg-emerald-50 text-emerald-900 font-bold"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{store.name}</p>
                            <p className="text-[11px] text-slate-500">{store.area} • {store.openHours}</p>
                          </div>
                          {selectedStoreId === store.id && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Search Autocomplete Bar */}
            <div className="flex-1 min-w-0 max-w-xl mx-auto">
              <SearchAutocomplete />
            </div>

            {/* Right Action Icons & Cart — z-20 so search overflow cannot swallow clicks */}
            <div className="relative z-20 flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                href="/stores"
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <StoreIcon className="w-4 h-4 text-slate-500" />
                <span>Stores</span>
              </Link>

              <Link
                href="/account"
                className="inline-flex items-center gap-1.5 px-2.5 min-h-10 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-black transition-all shadow-2xs"
                aria-label="Stillgood Wallet"
                title="Stillgood Wallet"
              >
                <span className="text-[10px] uppercase tracking-wide">Wallet</span>
                <span>{formatNaira(walletBalance)}</span>
              </Link>

              <Link
                href="/account"
                className={`inline-flex items-center gap-1.5 min-w-10 min-h-10 px-3 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                  customer
                    ? "border-emerald-200 bg-emerald-50 hover:border-emerald-400 text-emerald-800"
                    : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800"
                }`}
                aria-label={customer ? "Your account" : "Log in"}
                title={customer ? customer.name : "Log in"}
              >
                {customer ? (
                  <>
                    <span className="text-[11px] font-black">
                      {customer.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="hidden md:inline">Account</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Log in</span>
                  </>
                )}
              </Link>

              {/* Cart Drawer Trigger Button */}
              <button
                type="button"
                onClick={onOpenCart}
                className="relative inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 sm:px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-emerald-700/20 hover:shadow-emerald-700/30 transition-all cursor-pointer active:scale-95"
                aria-label="Open Cart"
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Basket</span>
                {cartItemCount > 0 && (
                  <span className="bg-amber-400 text-slate-950 text-xs font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {cartItemCount}
                  </span>
                )}
                {cartSubtotal > 0 && (
                  <span className="hidden md:inline font-bold border-l border-emerald-400/40 pl-2 text-emerald-100 text-xs">
                    {formatNaira(cartSubtotal)}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg animate-in slide-in-from-top-2">
            <div className="pb-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Partner Supermarket
              </p>
              <select
                value={selectedStoreId}
                onChange={(e) => {
                  if (onSelectStore) onSelectStore(e.target.value);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
              >
                <option value="all">All Partner Stores</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.area})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/stores"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <StoreIcon className="w-4 h-4 text-emerald-600" />
                <span>Stores</span>
              </Link>
              <Link
                href="/store"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <StoreIcon className="w-4 h-4 text-emerald-600" />
                <span>Store Login</span>
              </Link>
            </div>
          </div>
        )}
      </header>

    </>
  );
}

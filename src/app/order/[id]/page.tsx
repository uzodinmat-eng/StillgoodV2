"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  ArrowLeft, 
  Printer, 
  Share2, 
  Sparkles,
  Phone,
  QrCode,
  Building2,
  TrendingDown
} from "lucide-react";
import confetti from "canvas-confetti";
import { Order } from "@/lib/types";
import { getOrderById } from "@/lib/actions";
import { formatNaira } from "@/lib/pricing";
import { STORES } from "@/lib/data";

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderId = (params?.id as string) || "SG-84920";
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#059669", "#f59e0b", "#047857"],
      });
    } catch {
      // ignore
    }

    // Fetch order
    async function loadOrder() {
      try {
        const found = await getOrderById(orderId);
        if (found) {
          setOrder(found);
        } else {
          // Mock fallback order matching SG-XXXXX format
          const defaultStore = STORES[0];
          setOrder({
            id: orderId.startsWith("SG-") ? orderId : `SG-${orderId}`,
            customerName: "Amina Bello",
            customerEmail: "amina.bello@example.ng",
            customerPhone: "+234 803 456 7890",
            storeId: defaultStore.id,
            storeName: defaultStore.name,
            storeAddress: defaultStore.address,
            storeArea: defaultStore.area,
            subtotal: 14700,
            platformFee: 250,
            savingsTotal: 8300,
            total: 14950,
            status: "confirmed",
            paymentMethod: "paystack",
            paymentReference: `ref_${Date.now()}`,
            pickupDate: new Date().toISOString().split("T")[0],
            pickupTimeSlot: "4:00 PM – 7:00 PM",
            pickupVerificationCode: "4921",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [
              {
                productId: "sg_prod_001",
                productName: "Peak Full Cream Milk Powder (Refill Pack)",
                brand: "Peak Milk",
                unit: "850g Pouch",
                price: 5525,
                originalPrice: 8500,
                quantity: 1,
                image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80",
                storeId: defaultStore.id,
                storeName: defaultStore.name,
                expiryDate: "2026-09-12",
              },
              {
                productId: "sg_prod_002",
                productName: "Kellogg's Corn Flakes Original Family Pack",
                brand: "Kellogg's",
                unit: "750g Box",
                price: 3720,
                originalPrice: 6200,
                quantity: 1,
                image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80",
                storeId: defaultStore.id,
                storeName: defaultStore.name,
                expiryDate: "2026-09-08",
              },
            ],
          });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Retrieving Stillgood Pickup Pass...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Abuja Marketplace</span>
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Pass</span>
          </button>
        </div>

        {/* Success Hero Header */}
        <div className="bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl border border-emerald-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>RESERVATION CONFIRMED • READY FOR PICKUP</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Stillgood Pickup Pass
              </h1>
              <p className="text-xs sm:text-sm text-emerald-200/80">
                Show this digital pass to the store customer care counter upon arrival.
              </p>
            </div>

            {/* Big Order Number & PIN Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center sm:text-right shrink-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                Order Number
              </p>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {order.id}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 px-3 py-1 rounded-lg text-xs font-black">
                <span>PIN:</span>
                <span className="text-sm tracking-widest">{order.pickupVerificationCode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pickup Verification & Instructions Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          
          {/* Pickup Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-slate-100">
            
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wide">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Supermarket Pickup Location</span>
              </div>
              <p className="text-sm font-black text-slate-900">
                {order.storeName}
              </p>
              <p className="text-xs text-slate-600 font-medium">
                {order.storeAddress} ({order.storeArea})
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wide">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Scheduled Collection Window</span>
              </div>
              <p className="text-sm font-black text-slate-900">
                {new Date(order.pickupDate).toLocaleDateString("en-NG", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-emerald-700 font-bold">
                ⏰ {order.pickupTimeSlot}
              </p>
            </div>

          </div>

          {/* Customer & Payment Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                Customer Name
              </span>
              <span className="font-bold text-slate-800">{order.customerName}</span>
            </div>

            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                Phone Number
              </span>
              <span className="font-bold text-slate-800">{order.customerPhone}</span>
            </div>

            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                Payment Channel
              </span>
              <span className="font-bold text-emerald-700 uppercase">
                {order.paymentMethod} (Escrow Verified)
              </span>
            </div>
          </div>

          {/* Items Summary Table */}
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
              Reserved Rescue Groceries ({order.items.length})
            </h3>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-3 bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                      <Image
                        src={item.image}
                        alt={item.productName}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {item.productName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Qty: {item.quantity} • {item.unit} • Best before {item.expiryDate}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-900">
                      {formatNaira(item.price * item.quantity)}
                    </span>
                    <span className="text-[10px] text-slate-400 line-through block">
                      {formatNaira(item.originalPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Items Subtotal</span>
              <span>{formatNaira(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Platform Verification Fee</span>
              <span>{formatNaira(order.platformFee)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Total Food Waste Markdown Saved</span>
              <span>-{formatNaira(order.savingsTotal)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
              <span>Total Paid (Escrow)</span>
              <span className="text-emerald-700">{formatNaira(order.total)}</span>
            </div>
          </div>

          {/* Guarantee Box */}
          <div className="p-4 rounded-2xl bg-emerald-950 text-white flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-emerald-100">Stillgood Abuja Pickup Guarantee</p>
              <p className="text-emerald-300/80 mt-0.5 leading-relaxed font-medium">
                Store staff have placed your items in the designated Stillgood Pickup Shelf. Inspect your groceries at the counter before sharing your 4-digit verification PIN to release payment.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

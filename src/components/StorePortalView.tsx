"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  KeyRound,
  LogOut,
  Package,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Store as StoreIcon,
  X,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { ProductImageCapture } from "@/components/ProductImageCapture";
import { logout } from "@/lib/auth";
import { formatNaira } from "@/lib/pricing";
import {
  changeStorePasswordAction,
  completeStorePickupAction,
  createProductAction,
  updateProductAction,
} from "@/lib/store";
import {
  Category,
  Customer,
  DateType,
  Order,
  Product,
  Store,
} from "@/lib/types";

interface StorePortalViewProps {
  customer: Customer | null;
  store: Store | null;
  products: Product[];
  orders: Order[];
  categories: Category[];
  allStores?: Store[];
  error?: string;
}

export function StorePortalView({
  customer,
  store,
  products,
  orders,
  categories,
  allStores = [],
  error,
}: StorePortalViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"inventory" | "orders" | "settings">("inventory");
  const [orderSubTab, setOrderSubTab] = useState<"active" | "history">("active");
  const [authOpen, setAuthOpen] = useState(!customer);
  const [isPending, startTransition] = useTransition();

  // Listing Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState(categories[0]?.id || "");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("1 unit");
  const [originalPrice, setOriginalPrice] = useState<number>(1000);
  const [baseDiscountPercent, setBaseDiscountPercent] = useState<number>(35);
  const [dateType, setDateType] = useState<DateType>("best_before");
  const [expiryDate, setExpiryDate] = useState("");
  const [stockQuantity, setStockQuantity] = useState<number>(5);
  const [storageCondition, setStorageCondition] = useState<Product["storageCondition"]>("ambient");
  const [nafdacRegNo, setNafdacRegNo] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);

  // Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [pickupCodes, setPickupCodes] = useState<Record<string, string>>({});
  const [pickupMessages, setPickupMessages] = useState<Record<string, string>>({});

  const resetForm = () => {
    setEditingProduct(null);
    setName("");
    setBrand("");
    setCategory(categories[0]?.id || "");
    setDescription("");
    setUnit("1 unit");
    setOriginalPrice(1000);
    setBaseDiscountPercent(35);
    setDateType("best_before");
    setExpiryDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
    setStockQuantity(5);
    setStorageCondition("ambient");
    setNafdacRegNo("");
    setConditionNotes("");
    setImages([]);
    setFormError(null);
    setFormSuccess(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setBrand(p.brand);
    setCategory(p.category);
    setDescription(p.description);
    setUnit(p.unit);
    setOriginalPrice(p.originalPrice);
    setBaseDiscountPercent(p.baseDiscountPercent);
    setDateType(p.dateType);
    setExpiryDate(p.expiryDate);
    setStockQuantity(p.stockQuantity);
    setStorageCondition(p.storageCondition);
    setNafdacRegNo(p.nafdacRegNo || "");
    setConditionNotes(p.conditionNotes || "");
    setImages(p.images || []);
    setFormError(null);
    setFormSuccess(null);
    setModalOpen(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      if (editingProduct) {
        const res = await updateProductAction(editingProduct.id, {
          name,
          brand,
          category,
          description,
          unit,
          images,
          originalPrice,
          baseDiscountPercent,
          dateType,
          expiryDate,
          stockQuantity,
          storageCondition,
          nafdacRegNo,
          conditionNotes,
        });
        if (!res.success) {
          setFormError(res.error || "Failed to update product.");
          return;
        }
        setFormSuccess("Product updated successfully!");
      } else {
        const res = await createProductAction({
          storeId: store.id,
          name,
          brand,
          category,
          description,
          unit,
          images,
          originalPrice,
          baseDiscountPercent,
          dateType,
          expiryDate,
          stockQuantity,
          storageCondition,
          nafdacRegNo,
          conditionNotes,
        });
        if (!res.success) {
          setFormError(res.error || "Failed to list product.");
          return;
        }
        setFormSuccess("Product listed on Stillgood Marketplace!");
      }

      setTimeout(() => {
        setModalOpen(false);
        router.refresh();
      }, 700);
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);

    startTransition(async () => {
      const res = await changeStorePasswordAction(newPassword);
      if (!res.success) {
        setPasswordError(res.error || "Failed to update password.");
        return;
      }
      setPasswordMsg("Password changed successfully!");
      setNewPassword("");
    });
  };

  // Orders segregation
  const orderForStoreStatus = (order: Order) =>
    order.fulfillments?.find((fulfillment) => fulfillment.storeId === store?.id)?.status || order.status;
  const activeOrders = orders.filter((o) => {
    const status = orderForStoreStatus(o);
    return (
      status === "pending" ||
      status === "ready_for_pickup" ||
      status === "confirmed" ||
      status === "pending_payment"
    );
  });
  const previousOrders = orders.filter((o) => {
    const status = orderForStoreStatus(o);
    return status === "picked_up" || status === "cancelled";
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-md">
              SG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {store ? store.name : "Store Portal"}
                </h1>
                {store && (
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      store.status === "approved"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-amber-950 text-amber-400 border border-amber-800"
                    }`}
                  >
                    {store.status || "approved"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {store ? `${store.area} • Merchant Inventory & Orders` : "Stillgood Retail Operations"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-white font-bold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Marketplace</span>
            </Link>

            {customer && (
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.refresh();
                }}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white font-bold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        </div>

        {/* Portal Tabs */}
        {store && store.status === "approved" && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-6 border-t border-slate-800/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("inventory")}
              className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "inventory"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Inventory ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "orders"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Orders ({orders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "settings"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Account & Security</span>
            </button>
          </div>
        )}
      </header>

      {/* Body Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Not logged in */}
        {!customer && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 max-w-md mx-auto shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
              <StoreIcon className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Store Portal Login</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Log in with your registered supermarket manager credentials to view orders and list near-expiry groceries.
            </p>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
            >
              Log in to Store Account
            </button>
            <p className="text-[11px] text-slate-400">
              New store?{" "}
              <Link href="/store/register" className="text-emerald-600 font-bold hover:underline">
                Register your supermarket
              </Link>
            </p>
          </div>
        )}

        {/* Store Pending Approval */}
        {customer && store && store.status === "pending" && (
          <div className="bg-amber-50 rounded-3xl border border-amber-200 p-8 text-center space-y-3 max-w-lg mx-auto shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-200 text-amber-800 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black text-amber-900">Supermarket Registration Pending</h2>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              Your store <strong>{store.name}</strong> is currently being reviewed by Stillgood Admin. Once approved, you will be able to list items and manage pickup orders.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-block px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs"
              >
                Back to Marketplace
              </Link>
            </div>
          </div>
        )}

        {/* Error state */}
        {customer && !store && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
              <Building2 className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black text-slate-900">No Linked Supermarket</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Signed in as <strong>{customer.email}</strong>. This account is not linked as owner to an approved supermarket.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/store/register"
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
              >
                Register a Supermarket
              </Link>
            </div>
          </div>
        )}

        {/* Approved Store Content */}
        {customer && store && store.status === "approved" && (
          <>
            {/* Multi-Store Switcher (for Admin accounts) */}
            {allStores.length > 1 && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-600">Managing Supermarket:</span>
                <div className="flex gap-2 flex-wrap">
                  {allStores.map((s) => (
                    <Link
                      key={s.id}
                      href={`/store?storeId=${s.id}`}
                      className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
                        s.id === store.id
                          ? "bg-emerald-800 text-white border-emerald-900"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 1: INVENTORY */}
            {activeTab === "inventory" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Live Inventory & Deals</h2>
                    <p className="text-xs text-slate-500">
                      Items listed here automatically decay in price weekly and appear in Stillgood search and catalog.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openAddModal}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>List New Product</span>
                  </button>
                </div>

                {/* Filter Search */}
                <div className="relative max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter listed items by name or brand..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none shadow-2xs"
                  />
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-3 px-4">Product Details</th>
                          <th className="py-3 px-3">Category</th>
                          <th className="py-3 px-3">Price & Drift</th>
                          <th className="py-3 px-3">Stock Left</th>
                          <th className="py-3 px-3">Best Before</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-500">
                              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="font-bold text-slate-700">No products found</p>
                              <p className="text-slate-400 text-[11px]">Click &quot;List New Product&quot; to upload your first grocery deal.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                    <Image
                                      src={p.images[0] || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"}
                                      alt={p.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 line-clamp-1">{p.name}</p>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                      {p.brand} • {p.unit}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                                  {categories.find((c) => c.id === p.category)?.name || p.category}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <p className="font-black text-slate-900">{formatNaira(p.currentPrice)}</p>
                                <p className="text-[10px] text-slate-400 line-through">
                                  {formatNaira(p.originalPrice)} (-{p.discountPercent}%)
                                </p>
                              </td>
                              <td className="py-3 px-3 font-semibold">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                    p.stockQuantity > 3
                                      ? "bg-emerald-100 text-emerald-800"
                                      : p.stockQuantity > 0
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {p.stockQuantity} in bin
                                </span>
                              </td>
                              <td className="py-3 px-3 font-medium text-slate-700">
                                {p.expiryDate}
                                <span className="block text-[10px] text-slate-400">
                                  ({p.daysRemaining} days left)
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(p)}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 text-xs transition-colors cursor-pointer"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ORDERS */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Supermarket Pick List & Orders</h2>
                    <p className="text-xs text-slate-500">
                      Pack orders in your Stillgood Pickup Bin behind customer care. Verify the 4-digit PIN before customer/rider handoff.
                    </p>
                  </div>

                  {/* Sub-tabs */}
                  <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold shrink-0">
                    <button
                      type="button"
                      onClick={() => setOrderSubTab("active")}
                      className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                        orderSubTab === "active"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Active Picks ({activeOrders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderSubTab("history")}
                      className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                        orderSubTab === "history"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Order History ({previousOrders.length})
                    </button>
                  </div>
                </div>

                {/* Orders Grid */}
                <div className="space-y-4">
                  {(orderSubTab === "active" ? activeOrders : previousOrders).length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">No {orderSubTab} orders found</p>
                      <p className="text-xs text-slate-400">Orders placed by customers will appear here in real-time.</p>
                    </div>
                  ) : (
                    (orderSubTab === "active" ? activeOrders : previousOrders).map((order) => {
                      const storeFulfillment = order.fulfillments?.find((fulfillment) => fulfillment.storeId === store.id);
                      const storeItems = order.requiresConsolidation
                        ? order.items.filter((item) => item.storeId === store.id)
                        : order.items;
                      const storeStatus = storeFulfillment?.status || order.status;
                      return (
                      <div
                        key={order.id}
                        className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-base text-slate-900">{order.id}</span>
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md ${
                                storeStatus === "picked_up"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {storeStatus.replaceAll("_", " ")}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 font-medium">
                            Placed: {order.createdAt.slice(0, 10)} • Slot: <strong>{order.pickupTimeSlot}</strong>
                          </div>
                        </div>

                        {/* Customer & Verification */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                            <span className="font-bold text-slate-800">{order.customerName}</span>
                            <span className="block text-slate-500">{order.customerPhone}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pickup Date</span>
                            <span className="font-bold text-slate-800">{order.pickupDate}</span>
                            <span className="block text-slate-500">{order.pickupTimeSlot}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">4-Digit Verification PIN</span>
                            <span className="font-mono font-black text-sm text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md inline-block mt-0.5">
                              {storeFulfillment?.pickupCode || order.pickupVerificationCode}
                            </span>
                          </div>
                        </div>

                        {/* Items Checklist */}
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Items to pack:
                          </p>
                          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                            {storeItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 bg-white text-xs"
                              >
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-800">{item.productName}</p>
                                  <p className="text-[11px] text-slate-400">
                                    {item.brand} • {item.unit} • Expiry: {item.expiryDate}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                                    Qty: {item.quantity}
                                  </span>
                                  <span className="block text-[11px] text-slate-500 font-semibold mt-1">
                                    {formatNaira(item.price * item.quantity)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {storeStatus !== "picked_up" && storeStatus !== "cancelled" && (
                          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                            <input
                              inputMode="numeric"
                              maxLength={4}
                              value={pickupCodes[order.id] || ""}
                              onChange={(e) =>
                                setPickupCodes((current) => ({
                                  ...current,
                                  [order.id]: e.target.value.replace(/\D/g, "").slice(0, 4),
                                }))
                              }
                              placeholder="4-digit customer code"
                              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-bold focus:border-emerald-500 focus:bg-white focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={isPending || (pickupCodes[order.id] || "").length !== 4}
                              onClick={() => {
                                setPickupMessages((current) => ({ ...current, [order.id]: "" }));
                                startTransition(async () => {
                                  const result = await completeStorePickupAction({
                                    orderId: order.id,
                                    storeId: store.id,
                                    pickupCode: pickupCodes[order.id] || "",
                                  });
                                  setPickupMessages((current) => ({
                                    ...current,
                                    [order.id]: result.success
                                      ? "Pickup verified. Stock decremented and order completed."
                                      : result.error || "Pickup verification failed.",
                                  }));
                                  if (result.success) router.refresh();
                                });
                              }}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              Verify pickup & decrement stock
                            </button>
                          </div>
                        )}
                        {pickupMessages[order.id] && (
                          <p className={`text-xs font-bold ${pickupMessages[order.id].startsWith("Pickup verified") ? "text-emerald-700" : "text-rose-700"}`}>
                            {pickupMessages[order.id]}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold">
                          <span className="text-slate-500">Total Store Value:</span>
                          <span className="text-base font-black text-slate-900">{formatNaira(storeFulfillment?.subtotal ?? order.total)}</span>
                        </div>
                      </div>
                    )})
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ACCOUNT & SECURITY */}
            {activeTab === "settings" && (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Account Security & Settings</h2>
                  <p className="text-xs text-slate-500">
                    Update your store manager access password.
                  </p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Change Store Password
                    </h3>
                  </div>

                  {passwordMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                      {passwordMsg}
                    </div>
                  )}

                  {passwordError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                      {passwordError}
                    </div>
                  )}

                  <form onSubmit={handlePasswordSubmit} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        New Password (min 6 characters)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isPending ? "Updating Password…" : "Update Password"}
                    </button>
                  </form>
                </div>

                {/* Supermarket Profile Summary */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs text-xs">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                    Supermarket Profile Details
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Name</span>
                      <span className="font-bold text-slate-800">{store.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Area</span>
                      <span className="font-bold text-slate-800">{store.area}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Address</span>
                      <span className="text-slate-800">{store.address}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                      <span className="text-slate-800">{store.phone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                      <span className="font-bold text-emerald-700">{store.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Product Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />

          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 sm:p-7 border border-slate-200 z-10 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingProduct ? `Edit ${editingProduct.name}` : "List Short-Dated Item on Marketplace"}
              </h3>
              <p className="text-xs text-slate-500">
                Item price decays automatically weekly as it approaches Best-Before / Expiry.
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleProductSubmit} className="space-y-4">
              {/* Product Photo Upload / Camera */}
              <ProductImageCapture images={images} onChange={setImages} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Peak Full Cream Milk Powder"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Brand *
                  </label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Peak Milk"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Department / Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Pack / Unit Size *
                  </label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. 850g Pouch / 500ml"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Storage Condition
                  </label>
                  <select
                    value={storageCondition}
                    onChange={(e) => setStorageCondition(e.target.value as Product["storageCondition"])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  >
                    <option value="ambient">Ambient (Dry Shelf)</option>
                    <option value="chilled">Chilled (Refrigerated)</option>
                    <option value="frozen">Frozen (Deep Freeze)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Original Shelf Price (₦) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Base Markdown % * (e.g. 40%)
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={90}
                    value={baseDiscountPercent}
                    onChange={(e) => setBaseDiscountPercent(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Date Type *
                  </label>
                  <select
                    value={dateType}
                    onChange={(e) => setDateType(e.target.value as DateType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  >
                    <option value="best_before">Best Before (Quality)</option>
                    <option value="expiry">Expiry Date</option>
                    <option value="use_by">Use By (Strict Safety)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Date on Packaging *
                  </label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Stock Quantity in Stillgood Bin *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    NAFDAC Registration No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={nafdacRegNo}
                    onChange={(e) => setNafdacRegNo(e.target.value)}
                    placeholder="e.g. 01-1234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Packaging / Condition Notes
                  </label>
                  <input
                    type="text"
                    value={conditionNotes}
                    onChange={(e) => setConditionNotes(e.target.value)}
                    placeholder="e.g. Outer box slightly creased, factory foil seal intact."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of product and flavor..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-700/20 disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? "Saving Product…" : editingProduct ? "Save Changes" : "Publish to Marketplace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal for Store Login */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        nextPath="/store"
        allowGuest={false}
        title="Store Portal Login"
        subtitle="Sign in with your supermarket owner or manager account."
        onLoggedIn={async () => {
          setAuthOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

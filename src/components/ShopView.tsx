"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PackageX } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CategoryTiles } from "@/components/CategoryTiles";
import { StoreFilterBar, SortField, SortDirection } from "@/components/StoreFilterBar";
import { ProductCard } from "@/components/ProductCard";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Footer } from "@/components/Footer";
import { useProducts } from "@/components/CatalogProvider";
import { CartSummary } from "@/lib/types";
import { getCart } from "@/lib/actions";

const SORT_FIELDS: SortField[] = ["price", "upload_time", "expiry_time", "discount"];

function readSort(value: string | null): SortField {
  return SORT_FIELDS.includes(value as SortField) ? (value as SortField) : "discount";
}

export function ShopView() {
  const products = useProducts();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedStoreId = searchParams.get("store") || "all";
  const selectedCategoryId = searchParams.get("category") || "all";
  const sortField = readSort(searchParams.get("sort"));
  const sortDirection: SortDirection = searchParams.get("dir") === "asc" ? "asc" : "desc";

  const [cartSummary, setCartSummary] = useState<CartSummary>({
    items: [],
    itemCount: 0,
    subtotal: 0,
    originalSubtotal: 0,
    savingsTotal: 0,
    platformFee: 0,
    pickupFee: 0,
    total: 0,
    storesInvolved: [],
  });
  const returnedFromPaystack = searchParams.get("cart") === "1";
  const [cartDrawerOpen, setCartDrawerOpen] = useState(returnedFromPaystack);
  const [cartNotice, setCartNotice] = useState<string | null>(
    returnedFromPaystack ? "Payment did not go through. Your items are still in the basket." : null
  );
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const refreshCart = async () => {
    try {
      const updated = await getCart();
      setCartSummary(updated);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let cancelled = false;
    getCart()
      .then((updated) => {
        if (!cancelled) setCartSummary(updated);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const replaceFilters = (next: {
    store?: string;
    category?: string;
    sort?: SortField;
    dir?: SortDirection;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    const store = next.store ?? selectedStoreId;
    const category = next.category ?? selectedCategoryId;
    const sort = next.sort ?? sortField;
    const dir = next.dir ?? sortDirection;
    if (store === "all") params.delete("store");
    else params.set("store", store);
    if (category === "all") params.delete("category");
    else params.set("category", category);
    if (sort === "discount") params.delete("sort");
    else params.set("sort", sort);
    if (dir === "desc") params.delete("dir");
    else params.set("dir", dir);
    const query = params.toString();
    router.replace(query ? `/shop?${query}` : "/shop");
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        if (selectedStoreId !== "all" && product.storeId !== selectedStoreId) return false;
        if (selectedCategoryId !== "all" && product.category !== selectedCategoryId) return false;
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === "price") diff = a.currentPrice - b.currentPrice;
        else if (sortField === "upload_time") diff = new Date(a.listedAt).getTime() - new Date(b.listedAt).getTime();
        else if (sortField === "expiry_time") diff = a.daysRemaining - b.daysRemaining;
        else diff = a.discountPercent - b.discountPercent;
        return sortDirection === "asc" ? diff : -diff;
      });
  }, [products, selectedStoreId, selectedCategoryId, sortField, sortDirection]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-emerald-500 selection:text-white">
      <Navbar
        cartItemCount={cartSummary.itemCount}
        cartSubtotal={cartSummary.subtotal}
        onOpenCart={() => setCartDrawerOpen(true)}
        selectedStoreId={selectedStoreId}
        onSelectStore={(storeId) => replaceFilters({ store: storeId })}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        <CategoryTiles
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(categoryId) => replaceFilters({ category: categoryId })}
        />

        <StoreFilterBar
          selectedStoreId={selectedStoreId}
          onSelectStore={(storeId) => replaceFilters({ store: storeId })}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(categoryId) => replaceFilters({ category: categoryId })}
          sortField={sortField}
          onSortFieldChange={(field) => replaceFilters({ sort: field })}
          sortDirection={sortDirection}
          onToggleSortDirection={() => replaceFilters({ dir: sortDirection === "asc" ? "desc" : "asc" })}
          totalResultsCount={filteredProducts.length}
          onResetFilters={() => router.replace("/shop")}
        />

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <PackageX className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No rescue groceries match your selected filters
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Try switching supermarkets or viewing all categories to see available deals.
            </p>
            <button
              type="button"
              onClick={() => router.replace("/shop")}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-700/20"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onProductAddedToCart={refreshCart}
              />
            ))}
          </div>
        )}
      </main>

      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => {
          setCartDrawerOpen(false);
          setCartNotice(null);
        }}
        cartSummary={cartSummary}
        notice={cartNotice}
        onProceedToCheckout={() => setCheckoutModalOpen(true)}
        onCartChanged={setCartSummary}
      />
      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        cartSummary={cartSummary}
        onOrderCreated={() => {
          refreshCart();
        }}
        onReturnToBasket={(message) => {
          setCheckoutModalOpen(false);
          setCartNotice(message);
          setCartDrawerOpen(true);
        }}
      />
      <Footer />
    </div>
  );
}

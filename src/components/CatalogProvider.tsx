"use client";

import React, { createContext, useContext } from "react";
import {
  CatalogSnapshot,
  EMPTY_CATALOG,
  findCategoryInCatalog,
  findProductInCatalog,
  findStoreInCatalog,
  relatedProductsInCatalog,
  reviewsForStore,
} from "@/lib/catalog";
import { Category, Product, Store, StoreReviewData } from "@/lib/types";

const CatalogContext = createContext<CatalogSnapshot>(EMPTY_CATALOG);

export function CatalogProvider({
  catalog,
  children,
}: {
  catalog: CatalogSnapshot;
  children: React.ReactNode;
}) {
  return (
    <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog(): CatalogSnapshot {
  return useContext(CatalogContext);
}

export function useProducts(): Product[] {
  return useCatalog().products;
}

export function useStores(): Store[] {
  return useCatalog().stores;
}

export function useCategories(): Category[] {
  return useCatalog().categories;
}

export function useProductById(idOrSlug: string): Product | undefined {
  return findProductInCatalog(useCatalog(), idOrSlug);
}

export function useStoreById(idOrSlug: string): Store | undefined {
  return findStoreInCatalog(useCatalog(), idOrSlug);
}

export function useCategoryById(idOrSlug: string): Category | undefined {
  return findCategoryInCatalog(useCatalog(), idOrSlug);
}

export function useRelatedProducts(product: Product, limit = 4): Product[] {
  return relatedProductsInCatalog(useCatalog(), product, limit);
}

export function useStoreReviews(storeId: string): StoreReviewData {
  return reviewsForStore(useCatalog(), storeId);
}

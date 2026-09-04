import { Category, Product, Store, StoreReviewData } from "@/lib/types";

const DEFAULT_REVIEW: StoreReviewData = {
  freshnessScore: 4.8,
  handoffSpeedScore: 4.8,
  cleanlinessScore: 4.8,
  reviews: [],
};

export interface CatalogSnapshot {
  products: Product[];
  stores: Store[];
  categories: Category[];
  reviews: Record<string, StoreReviewData>;
}

export const EMPTY_CATALOG: CatalogSnapshot = {
  products: [],
  stores: [],
  categories: [],
  reviews: {},
};

export function findProductInCatalog(
  snapshot: CatalogSnapshot,
  idOrSlug: string
): Product | undefined {
  return snapshot.products.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

export function findStoreInCatalog(
  snapshot: CatalogSnapshot,
  idOrSlug: string
): Store | undefined {
  return snapshot.stores.find((s) => s.id === idOrSlug || s.slug === idOrSlug);
}

export function findCategoryInCatalog(
  snapshot: CatalogSnapshot,
  idOrSlug: string
): Category | undefined {
  return snapshot.categories.find((c) => c.id === idOrSlug || c.slug === idOrSlug);
}

export function relatedProductsInCatalog(
  snapshot: CatalogSnapshot,
  product: Product,
  limit = 4
): Product[] {
  const others = snapshot.products.filter((p) => p.id !== product.id);
  const sameStore = others.filter((p) => p.storeId === product.storeId);
  const sameCategory = others.filter(
    (p) => p.category === product.category && p.storeId !== product.storeId
  );
  const seen = new Set<string>();
  const related: Product[] = [];
  for (const candidate of [...sameStore, ...sameCategory, ...others]) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    related.push(candidate);
    if (related.length >= limit) break;
  }
  return related;
}

export function reviewsForStore(
  snapshot: CatalogSnapshot,
  storeId: string
): StoreReviewData {
  return snapshot.reviews[storeId] || DEFAULT_REVIEW;
}

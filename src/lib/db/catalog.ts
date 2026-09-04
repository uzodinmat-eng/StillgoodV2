import {
  CatalogSnapshot,
  findProductInCatalog,
  findStoreInCatalog,
} from "@/lib/catalog";
import { Category, DateType, Product, Store, StoreReviewData } from "@/lib/types";
import {
  calculateDriftPrice,
  generateDriftSchedule,
  getDaysRemaining,
} from "@/lib/pricing";
import { asInt, dateOnly, query } from "./client";

export type { CatalogSnapshot } from "@/lib/catalog";
export {
  findCategoryInCatalog,
  findProductInCatalog,
  findStoreInCatalog,
  relatedProductsInCatalog,
  reviewsForStore,
} from "@/lib/catalog";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  area: string;
  address: string;
  phone: string;
  rating: number | string;
  review_count: number | string;
  open_hours: string;
  pickup_instructions: string;
  image_url: string;
  banner_image_url: string | null;
  lat: number | string;
  lng: number | string;
  is_active: boolean;
  status?: string | null;
  owner_id?: string | null;
  cac_number?: string | null;
  store_type?: string | null;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  item_count: number | string;
  gradient: string;
  bg_light: string;
}

interface ProductRow {
  id: string;
  name: string;
  brand: string;
  slug: string;
  category_id: string;
  store_id: string;
  description: string;
  unit: string;
  images: string[] | null;
  original_price: number | string;
  base_discount_percent: number | string;
  date_type: string;
  expiry_date: Date | string;
  listed_at: Date | string;
  drift_rate_weekly: number | string;
  stock_quantity: number | string;
  featured: boolean;
  storage_condition: Product["storageCondition"];
  nafdac_reg_no: string | null;
  condition_notes: string | null;
  nutritional_highlights: string[] | null;
}

interface ReviewScoreRow {
  store_id: string;
  freshness_score: number | string;
  handoff_speed_score: number | string;
  cleanliness_score: number | string;
}

interface ReviewRow {
  id: string;
  store_id: string;
  customer_name: string;
  rating: number | string;
  reviewed_on: string;
  comment: string;
  verified_pickup: boolean;
  user_type: "Customer" | "Dispatch Rider";
}

function asDateType(value: string): DateType {
  if (value === "best_before" || value === "use_by" || value === "expiry") {
    return value;
  }
  return "expiry";
}

function asStoreArea(value: string): Store["area"] {
  return value as Store["area"];
}

function hydrateProduct(row: ProductRow): Product {
  const expiryDate = dateOnly(row.expiry_date);
  const listedAt = dateOnly(row.listed_at);
  const originalPrice = asInt(row.original_price);
  const baseDiscountPercent = Number(row.base_discount_percent);
  const driftRateWeekly = Number(row.drift_rate_weekly) || 0.025;
  const stockQuantity = asInt(row.stock_quantity);
  const daysRemaining = getDaysRemaining(expiryDate);
  const driftResult = calculateDriftPrice({
    originalPrice,
    baseDiscountPercent,
    listedAt,
    weeklyDriftRate: driftRateWeekly,
  });
  const driftSchedule = generateDriftSchedule({
    originalPrice,
    baseDiscountPercent,
    listedAt,
    expiryDate,
    weeklyDriftRate: driftRateWeekly,
  });

  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    slug: row.slug,
    category: row.category_id,
    storeId: row.store_id,
    description: row.description,
    unit: row.unit,
    images: Array.isArray(row.images) ? row.images : [],
    originalPrice,
    baseDiscountPercent,
    currentPrice: driftResult.currentPrice,
    discountPercent: driftResult.totalDiscountPercent,
    dateType: asDateType(row.date_type),
    expiryDate,
    daysRemaining,
    listedAt,
    driftRateWeekly,
    driftSchedule,
    stockQuantity,
    isAvailable: stockQuantity > 0 && daysRemaining > 0,
    featured: Boolean(row.featured),
    storageCondition: row.storage_condition,
    nafdacRegNo: row.nafdac_reg_no || undefined,
    conditionNotes: row.condition_notes || undefined,
    nutritionalHighlights: Array.isArray(row.nutritional_highlights)
      ? row.nutritional_highlights
      : undefined,
  };
}

function hydrateStore(row: StoreRow, dealCount: number): Store {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    area: asStoreArea(row.area),
    address: row.address,
    phone: row.phone,
    rating: Number(row.rating) || 0,
    reviewCount: asInt(row.review_count),
    openHours: row.open_hours,
    pickupInstructions: row.pickup_instructions,
    image: row.image_url,
    bannerImage: row.banner_image_url || undefined,
    coordinates: {
      lat: Number(row.lat),
      lng: Number(row.lng),
    },
    isActive: Boolean(row.is_active),
    totalDeals: dealCount,
    status: row.status === "pending" || row.status === "suspended" ? row.status : "approved",
    ownerId: row.owner_id || undefined,
    cacNumber: row.cac_number || undefined,
    storeType: row.store_type || "supermarket",
  };
}

function hydrateCategory(row: CategoryRow, itemCount: number): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    description: row.description,
    itemCount,
    gradient: row.gradient,
    bgLight: row.bg_light,
  };
}

export async function loadCatalog(): Promise<CatalogSnapshot> {
  const [storeRows, categoryRows, productRows, scoreRows, reviewRows] =
    await Promise.all([
      query<StoreRow>(
        `select id, name, slug, area, address, phone, rating, review_count,
                open_hours, pickup_instructions, image_url, banner_image_url,
                lat, lng, is_active
           from public.stores
          where is_active = true and coalesce(status, 'approved') = 'approved'
          order by name`
      ),
      query<CategoryRow>(
        `select id, name, slug, icon, description, item_count, gradient, bg_light
           from public.categories
          order by name`
      ),
      query<ProductRow>(
        `select id, name, brand, slug, category_id, store_id, description, unit,
                images, original_price, base_discount_percent, date_type,
                expiry_date, listed_at, drift_rate_weekly, stock_quantity,
                featured, storage_condition, nafdac_reg_no, condition_notes,
                nutritional_highlights
           from public.products
          order by listed_at desc`
      ),
      query<ReviewScoreRow>(
        `select store_id, freshness_score, handoff_speed_score, cleanliness_score
           from public.store_review_scores`
      ),
      query<ReviewRow>(
        `select id, store_id, customer_name, rating, reviewed_on, comment,
                verified_pickup, user_type
           from public.store_reviews
          order by id`
      ),
    ]);

  const products = productRows.map(hydrateProduct);
  const dealCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const product of products) {
    dealCounts.set(product.storeId, (dealCounts.get(product.storeId) || 0) + 1);
    categoryCounts.set(
      product.category,
      (categoryCounts.get(product.category) || 0) + 1
    );
  }

  const stores = storeRows.map((row) =>
    hydrateStore(row, dealCounts.get(row.id) || 0)
  );
  const categories = categoryRows.map((row) =>
    hydrateCategory(row, categoryCounts.get(row.id) ?? asInt(row.item_count))
  );

  const reviews: Record<string, StoreReviewData> = {};
  for (const score of scoreRows) {
    reviews[score.store_id] = {
      freshnessScore: Number(score.freshness_score),
      handoffSpeedScore: Number(score.handoff_speed_score),
      cleanlinessScore: Number(score.cleanliness_score),
      reviews: [],
    };
  }
  for (const row of reviewRows) {
    const bucket = reviews[row.store_id] || {
      freshnessScore: 4.8,
      handoffSpeedScore: 4.8,
      cleanlinessScore: 4.8,
      reviews: [],
    };
    bucket.reviews.push({
      id: row.id,
      customerName: row.customer_name,
      rating: Number(row.rating),
      date: row.reviewed_on,
      comment: row.comment,
      verifiedPickup: Boolean(row.verified_pickup),
      userType: row.user_type,
    });
    reviews[row.store_id] = bucket;
  }

  return { products, stores, categories, reviews };
}

export async function getProductById(idOrSlug: string): Promise<Product | undefined> {
  const snapshot = await loadCatalog();
  return findProductInCatalog(snapshot, idOrSlug);
}

export async function getStoreById(idOrSlug: string): Promise<Store | undefined> {
  const snapshot = await loadCatalog();
  return findStoreInCatalog(snapshot, idOrSlug);
}

import { DateType, Product } from "@/lib/types";
import {
  calculateDriftPrice,
  generateDriftSchedule,
  getDaysRemaining,
} from "@/lib/pricing";
import { asInt, dateOnly, execute, query, queryOne } from "./client";

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

const PRODUCT_COLUMNS = `id, name, brand, slug, category_id, store_id, description, unit,
  images, original_price, base_discount_percent, date_type,
  expiry_date, listed_at, drift_rate_weekly, stock_quantity,
  featured, storage_condition, nafdac_reg_no, condition_notes,
  nutritional_highlights`;

function asDateType(value: string): DateType {
  if (value === "best_before" || value === "use_by" || value === "expiry") {
    return value;
  }
  return "expiry";
}

export function hydrateProductRow(row: ProductRow): Product {
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

export function slugifyProductName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || `item-${Date.now()}`;
}

export async function findProductsForStore(storeId: string): Promise<Product[]> {
  const rows = await query<ProductRow>(
    `select ${PRODUCT_COLUMNS} from public.products
     where store_id = $1
     order by listed_at desc, created_at desc`,
    [storeId]
  );
  return rows.map(hydrateProductRow);
}

export async function findProductById(id: string): Promise<Product | null> {
  const row = await queryOne<ProductRow>(
    `select ${PRODUCT_COLUMNS} from public.products where id = $1 limit 1`,
    [id]
  );
  return row ? hydrateProductRow(row) : null;
}

export async function findProductBySlug(slug: string): Promise<Product | null> {
  const row = await queryOne<ProductRow>(
    `select ${PRODUCT_COLUMNS} from public.products where slug = $1 limit 1`,
    [slug]
  );
  return row ? hydrateProductRow(row) : null;
}

export async function insertProduct(input: {
  storeId: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  unit: string;
  images?: string[];
  originalPrice: number;
  baseDiscountPercent: number;
  dateType: DateType;
  expiryDate: string;
  listedAt?: string;
  stockQuantity: number;
  storageCondition: Product["storageCondition"];
  nafdacRegNo?: string;
  conditionNotes?: string;
  nutritionalHighlights?: string[];
}): Promise<Product> {
  let slug = slugifyProductName(input.name);
  if (await findProductBySlug(slug)) {
    slug = `${slug}-${String(Date.now()).slice(-4)}`;
  }
  const id = `sg_prod_${String(Date.now()).slice(-6)}_${Math.random().toString(36).substring(2, 5)}`;
  const listedAt = input.listedAt || new Date().toISOString().slice(0, 10);
  const images = input.images && input.images.length > 0
    ? input.images
    : ["https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"];

  await execute(
    `insert into public.products (
        id, name, brand, slug, category_id, store_id, description, unit,
        images, original_price, base_discount_percent, date_type,
        expiry_date, listed_at, drift_rate_weekly, stock_quantity,
        featured, storage_condition, nafdac_reg_no, condition_notes,
        nutritional_highlights, created_at, updated_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9::text[], $10, $11, $12,
        $13, $14, 0.025, $15,
        false, $16, $17, $18,
        $19::text[], now(), now()
      )`,
    [
      id,
      input.name.trim(),
      input.brand.trim() || "Brand",
      slug,
      input.category,
      input.storeId,
      input.description.trim(),
      input.unit.trim(),
      images,
      input.originalPrice,
      input.baseDiscountPercent,
      input.dateType,
      input.expiryDate,
      listedAt,
      input.stockQuantity,
      input.storageCondition,
      input.nafdacRegNo?.trim() || null,
      input.conditionNotes?.trim() || null,
      input.nutritionalHighlights || [],
    ]
  );

  const created = await findProductById(id);
  if (!created) throw new Error("Product creation failed");
  return created;
}

export async function updateProduct(
  id: string,
  input: {
    name?: string;
    brand?: string;
    category?: string;
    description?: string;
    unit?: string;
    images?: string[];
    originalPrice?: number;
    baseDiscountPercent?: number;
    dateType?: DateType;
    expiryDate?: string;
    stockQuantity?: number;
    storageCondition?: Product["storageCondition"];
    nafdacRegNo?: string;
    conditionNotes?: string;
  }
): Promise<Product | null> {
  const current = await findProductById(id);
  if (!current) return null;

  await execute(
    `update public.products
     set name = coalesce($2, name),
         brand = coalesce($3, brand),
         category_id = coalesce($4, category_id),
         description = coalesce($5, description),
         unit = coalesce($6, unit),
         images = coalesce($7::text[], images),
         original_price = coalesce($8, original_price),
         base_discount_percent = coalesce($9, base_discount_percent),
         date_type = coalesce($10, date_type),
         expiry_date = coalesce($11, expiry_date),
         stock_quantity = coalesce($12, stock_quantity),
         storage_condition = coalesce($13, storage_condition),
         nafdac_reg_no = coalesce($14, nafdac_reg_no),
         condition_notes = coalesce($15, condition_notes),
         updated_at = now()
     where id = $1`,
    [
      id,
      input.name?.trim() || null,
      input.brand?.trim() || null,
      input.category || null,
      input.description?.trim() || null,
      input.unit?.trim() || null,
      input.images && input.images.length > 0 ? input.images : null,
      input.originalPrice !== undefined ? input.originalPrice : null,
      input.baseDiscountPercent !== undefined ? input.baseDiscountPercent : null,
      input.dateType || null,
      input.expiryDate || null,
      input.stockQuantity !== undefined ? input.stockQuantity : null,
      input.storageCondition || null,
      input.nafdacRegNo?.trim() || null,
      input.conditionNotes?.trim() || null,
    ]
  );

  return findProductById(id);
}

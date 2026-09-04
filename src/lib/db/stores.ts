import { Store } from "@/lib/types";
import { asInt, execute, query, queryOne } from "./client";

export const STORE_AREAS: Store["area"][] = [
  "Wuse II",
  "Maitama",
  "Garki",
  "Jabi",
  "Utako",
  "Central Area",
  "Jahi",
  "Gwarinpa",
];

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80";
const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";
const DEFAULT_LAT = 9.0578;
const DEFAULT_LNG = 7.4951;

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
}

function mapStore(row: StoreRow, dealCount = 0): Store {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    area: row.area as Store["area"],
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
  };
}

export function slugifyStoreName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || `store-${Date.now()}`;
}

export async function listStores(): Promise<Store[]> {
  const rows = await query<StoreRow>(
    `select id, name, slug, area, address, phone, rating, review_count,
            open_hours, pickup_instructions, image_url, banner_image_url,
            lat, lng, is_active
       from public.stores
      order by name`
  );
  const counts = await query<{ store_id: string; n: number | string }>(
    `select store_id, count(*)::int as n from public.products group by store_id`
  );
  const dealCounts = new Map(
    counts.map((row) => [row.store_id, asInt(row.n)])
  );
  return rows.map((row) => mapStore(row, dealCounts.get(row.id) || 0));
}

export async function findStoreBySlug(slug: string): Promise<Store | null> {
  const row = await queryOne<StoreRow>(
    `select id, name, slug, area, address, phone, rating, review_count,
            open_hours, pickup_instructions, image_url, banner_image_url,
            lat, lng, is_active
       from public.stores
      where slug = $1
      limit 1`,
    [slug]
  );
  return row ? mapStore(row) : null;
}

export async function insertStore(input: {
  name: string;
  area: Store["area"];
  address: string;
  phone: string;
  openHours?: string;
  pickupInstructions?: string;
  image?: string;
  bannerImage?: string;
  lat?: number;
  lng?: number;
}): Promise<Store> {
  let slug = slugifyStoreName(input.name);
  if (await findStoreBySlug(slug)) {
    slug = `${slug}-${String(Date.now()).slice(-4)}`;
  }
  const id = `store_${slug.replace(/-/g, "_")}`;

  const store: Store = {
    id,
    name: input.name.trim(),
    slug,
    area: input.area,
    address: input.address.trim(),
    phone: input.phone.trim(),
    rating: 0,
    reviewCount: 0,
    openHours: input.openHours?.trim() || "8:00 AM – 9:00 PM (Daily)",
    pickupInstructions:
      input.pickupInstructions?.trim() ||
      "Pick up in person or send a dispatch rider. Present your order number SG-XXXXX and 4-digit PIN at the customer care desk.",
    image: input.image?.trim() || DEFAULT_IMAGE,
    bannerImage: input.bannerImage?.trim() || DEFAULT_BANNER,
    coordinates: {
      lat: Number.isFinite(input.lat) ? Number(input.lat) : DEFAULT_LAT,
      lng: Number.isFinite(input.lng) ? Number(input.lng) : DEFAULT_LNG,
    },
    isActive: true,
    totalDeals: 0,
  };

  await execute(
    `insert into public.stores (
        id, name, slug, area, address, phone, rating, review_count,
        open_hours, pickup_instructions, image_url, banner_image_url,
        lat, lng, is_active
      ) values (
        $1, $2, $3, $4, $5, $6, 0, 0,
        $7, $8, $9, $10,
        $11, $12, true
      )`,
    [
      store.id,
      store.name,
      store.slug,
      store.area,
      store.address,
      store.phone,
      store.openHours,
      store.pickupInstructions,
      store.image,
      store.bannerImage || null,
      store.coordinates.lat,
      store.coordinates.lng,
    ]
  );

  return store;
}

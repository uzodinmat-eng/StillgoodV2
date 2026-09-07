export type DateType = "best_before" | "use_by" | "expiry";

export type UrgencyLevel = "critical" | "urgent" | "moderate" | "safe";

export interface StoreReview {
  id: string;
  customerName: string;
  rating: number;
  date: string;
  comment: string;
  verifiedPickup: boolean;
  userType: "Customer" | "Dispatch Rider";
}

export interface StoreReviewData {
  freshnessScore: number;
  handoffSpeedScore: number;
  cleanlinessScore: number;
  reviews: StoreReview[];
}

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

export type StoreStatus = "pending" | "approved" | "suspended";

export interface Store {
  id: string;
  name: string;
  slug: string;
  area: "Wuse II" | "Maitama" | "Garki" | "Jabi" | "Utako" | "Central Area" | "Jahi" | "Gwarinpa";
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  openHours: string;
  pickupInstructions: string;
  image: string;
  bannerImage?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  isActive: boolean;
  totalDeals: number;
  status?: StoreStatus;
  ownerId?: string;
  cacNumber?: string;
  storeType?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  itemCount: number;
  gradient: string;
  bgLight: string;
}

export interface DriftScheduleStep {
  date: string;
  label: string;
  discountPercent: number;
  price: number;
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  slug: string;
  category: string;
  storeId: string;
  description: string;
  unit: string;
  images: string[];
  
  // Pricing
  originalPrice: number;
  baseDiscountPercent: number;
  currentPrice: number;
  discountPercent: number;
  
  // Expiry & Dynamic Decay
  dateType: DateType;
  expiryDate: string; // YYYY-MM-DD
  daysRemaining: number;
  listedAt: string; // YYYY-MM-DD
  driftRateWeekly: number; // e.g. 0.025 (2.5% weekly)
  driftSchedule?: DriftScheduleStep[];
  
  // Inventory
  stockQuantity: number;
  isAvailable: boolean;
  featured: boolean;
  
  // Specs
  storageCondition: "ambient" | "chilled" | "frozen";
  nafdacRegNo?: string;
  conditionNotes?: string;
  nutritionalHighlights?: string[];
}

export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: number;
}

export interface PopulatedCartItem {
  product: Product;
  store: Store;
  quantity: number;
  itemTotal: number;
  originalItemTotal: number;
  savingsTotal: number;
}

export interface CartSummary {
  items: PopulatedCartItem[];
  itemCount: number;
  subtotal: number;
  originalSubtotal: number;
  savingsTotal: number;
  platformFee: number;
  pickupFee: number;
  total: number;
  storesInvolved: Store[];
}

export type OrderStatus = 
  | "pending_payment"
  | "paid"
  | "awaiting_store_confirmation"
  | "confirmed"
  | "partially_fulfilled"
  | "ready_for_pickup"
  | "picked_up"
  | "cancelled";

export interface OrderItemRecord {
  productId: string;
  productName: string;
  brand: string;
  unit: string;
  price: number;
  originalPrice: number;
  quantity: number;
  image: string;
  storeId: string;
  storeName: string;
  expiryDate: string;
  fulfillmentStatus?: "pending" | "available" | "unavailable" | "picked_up";
  refundedAt?: string;
}

export type CustomerRole = "customer" | "admin" | "store_owner";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  walletBalance: number;
  createdAt: string;
  authUserId?: string;
  role?: CustomerRole;
  storeId?: string;
}

export interface StoreFulfillment {
  storeId: string;
  subtotal: number;
  status: "pending" | "ready_for_pickup" | "picked_up" | "cancelled";
  pickupCode: string;
  pickedUpAt?: string;
}

export interface Order {
  id: string; // SG-XXXXX
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItemRecord[];
  
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeArea: string;
  
  subtotal: number;
  platformFee: number;
  pickupFee: number;
  savingsTotal: number;
  total: number;
  
  status: OrderStatus;
  paymentMethod: "paystack" | "flutterwave" | "bank_transfer" | "wallet";
  paymentReference: string;
  pickupDate: string;
  pickupTimeSlot: string;
  pickupVerificationCode: string; // 4-digit PIN e.g. "7294"
  pickedUpAt?: string;
  fulfillments?: StoreFulfillment[];

  /** True when the cart spanned more than one partner supermarket. */
  requiresConsolidation?: boolean;
  originStores?: { id: string; name: string; area: string }[];
  hubBatch?: "noon" | "evening" | null;
  
  createdAt: string;
  updatedAt: string;
}

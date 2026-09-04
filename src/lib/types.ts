export type DateType = "best_before" | "use_by" | "expiry";

export type UrgencyLevel = "critical" | "urgent" | "moderate" | "safe";

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
  total: number;
  storesInvolved: Store[];
}

export type OrderStatus = 
  | "pending_payment"
  | "confirmed"
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
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  walletBalance: number;
  createdAt: string;
  authUserId?: string;
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
  savingsTotal: number;
  total: number;
  
  status: OrderStatus;
  paymentMethod: "paystack" | "flutterwave" | "bank_transfer" | "wallet";
  paymentReference: string;
  pickupDate: string;
  pickupTimeSlot: string;
  pickupVerificationCode: string; // 4-digit PIN e.g. "7294"
  pickedUpAt?: string;

  /** True when the cart spanned more than one partner supermarket. */
  requiresConsolidation?: boolean;
  originStores?: { id: string; name: string; area: string }[];
  hubBatch?: "noon" | "evening" | null;
  
  createdAt: string;
  updatedAt: string;
}

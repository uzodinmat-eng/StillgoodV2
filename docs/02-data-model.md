# Stillgood Data Model Specification

## 1. Entities & Types

### Store / Retail Hub
```typescript
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
  coordinates: {
    lat: number;
    lng: number;
  };
  isActive: boolean;
}
```

### Category
```typescript
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string; // Lucide icon identifier
  description: string;
  itemCount: number;
  colorTheme: string;
}
```

### Product & Near-Expiry Batch
```typescript
export type DateType = "best_before" | "use_by" | "expiry";

export interface Product {
  id: string;
  name: string;
  brand: string;
  slug: string;
  category: string; // Category ID
  storeId: string; // Store ID
  description: string;
  unit: string; // e.g., "500g", "1L", "Pack of 6", "1kg"
  images: string[];
  
  // Pricing
  originalPrice: number; // in NGN
  baseDiscountPercent: number; // initial markdown (e.g. 35%)
  currentPrice: number; // dynamically computed with weekly drift
  
  // Expiry & Drift
  dateType: DateType;
  expiryDate: string; // ISO 8601 YYYY-MM-DD
  daysRemaining: number; // computed relative to current time
  listedAt: string; // ISO 8601
  driftRateWeekly: number; // default 0.025 (2.5% per week)
  
  // Inventory
  stockQuantity: number;
  isAvailable: boolean;
  featured: boolean;
  
  // Storage & Handling
  storageCondition: "ambient" | "chilled" | "frozen";
  nafdacRegNo?: string;
  conditionNotes?: string; // e.g., "Slightly dented box, product intact sealed"
}
```

### Cart Item (Stored in Cookie Session)
```typescript
export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  storeId: string;
}

export interface CartSession {
  items: CartItem[];
  updatedAt: number;
}
```

### Order
```typescript
export type OrderStatus = 
  | "pending_payment"
  | "confirmed"
  | "ready_for_pickup"
  | "picked_up"
  | "cancelled";

export interface OrderItem {
  productId: string;
  productName: string;
  brand: string;
  unit: string;
  price: number;
  originalPrice: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string; // "SG-XXXXX"
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  storeId: string;
  items: OrderItem[];
  
  // Financial Breakdown (in NGN)
  subtotal: number;
  platformFee: number;
  savingsTotal: number;
  total: number;
  
  // Status & Timestamps
  status: OrderStatus;
  paymentMethod: "paystack" | "flutterwave" | "bank_transfer" | "wallet";
  paymentReference: string;
  pickupDate: string; // e.g. "2026-09-02"
  pickupTimeSlot: string; // e.g. "4:00 PM - 7:00 PM"
  pickupVerificationCode: string; // 4-digit code e.g. "4920"
  
  createdAt: string;
  updatedAt: string;
}
```

---

## Updates since original

Added in code (`src/lib/types.ts`); original Order block above is unchanged.

```typescript
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  walletBalance: number;
  createdAt: string;
}

// Extra fields now on Order:
// customerId?: string
// requiresConsolidation?: boolean
// originStores?: { id: string; name: string; area: string }[]
// hubBatch?: "noon" | "evening" | null
```

`SG-XXXXX` is still the order id. Buyer session is phone OTP (`src/lib/auth.ts`; dev code `123456`). Consolidation rules: `src/lib/fulfillment.ts`.

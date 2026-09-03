import { Category, Product, Store } from "./types";
import { calculateDriftPrice, generateDriftSchedule, getDaysRemaining } from "./pricing";

export const STORES: Store[] = [
  {
    id: "store_grand_square",
    name: "Grand Square Supermarket & Bakery",
    slug: "grand-square-central-area",
    area: "Central Area",
    address: "Plot 272, Central Business District, Mohammadu Buhari Way, Abuja",
    phone: "+234 803 900 1122",
    rating: 4.8,
    reviewCount: 342,
    openHours: "8:00 AM – 9:00 PM (Daily)",
    pickupInstructions: "Pick up in person or send a dispatch rider. Present your order number SG-XXXXX and 4-digit PIN at the customer care desk.",
    image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80",
    bannerImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    coordinates: { lat: 9.0578, lng: 7.4951 },
    isActive: true,
    totalDeals: 3,
  },
  {
    id: "store_h_medix",
    name: "H-Medix Pharmacy & Supermarket",
    slug: "h-medix-wuse-2",
    area: "Wuse II",
    address: "43 Ademola Adetokunbo Crescent, Wuse II, Abuja",
    phone: "+234 802 444 8899",
    rating: 4.9,
    reviewCount: 520,
    openHours: "8:00 AM – 10:00 PM (Daily)",
    pickupInstructions: "Pick up in person or send a dispatch rider. Present your order number SG-XXXXX and 4-digit PIN at the customer care desk.",
    image: "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=800&q=80",
    bannerImage: "https://images.unsplash.com/photo-1579113800032-c38bd7635818?auto=format&fit=crop&w=1200&q=80",
    coordinates: { lat: 9.0772, lng: 7.4812 },
    isActive: true,
    totalDeals: 3,
  },
  {
    id: "store_next_cash_carry",
    name: "Next Cash & Carry Mega Supermarket",
    slug: "next-cash-carry-jahi",
    area: "Jahi",
    address: "Ahmadu Bello Way, Jahi/Kado District, Abuja",
    phone: "+234 818 777 0011",
    rating: 4.7,
    reviewCount: 890,
    openHours: "9:00 AM – 8:30 PM (Daily)",
    pickupInstructions: "Pick up in person or send a dispatch rider. Present your order number SG-XXXXX and 4-digit PIN at Entrance B online pickup desk.",
    image: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=800&q=80",
    bannerImage: "https://images.unsplash.com/photo-1506484381205-f7945653044d?auto=format&fit=crop&w=1200&q=80",
    coordinates: { lat: 9.0911, lng: 7.4328 },
    isActive: true,
    totalDeals: 2,
  },
  {
    id: "store_4u",
    name: "4U Supermarket (formerly Amigo)",
    slug: "4u-supermarket-wuse-2",
    area: "Wuse II",
    address: "54 Aminu Kano Crescent, Wuse II, Abuja",
    phone: "+234 809 123 4567",
    rating: 4.6,
    reviewCount: 410,
    openHours: "8:30 AM – 9:30 PM (Daily)",
    pickupInstructions: "Pick up in person or send a dispatch rider. Present your order number SG-XXXXX and 4-digit PIN at the customer care desk.",
    image: "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&w=800&q=80",
    bannerImage: "https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=1200&q=80",
    coordinates: { lat: 9.0715, lng: 7.4789 },
    isActive: true,
    totalDeals: 3,
  },
  {
    id: "store_sahad",
    name: "Sahad Stores",
    slug: "sahad-stores-central-area",
    area: "Central Area",
    address: "Area 11, Off Tafawa Balewa Way, Central Business District, Abuja",
    phone: "+234 803 555 9900",
    rating: 4.7,
    reviewCount: 630,
    openHours: "8:30 AM – 8:00 PM (Daily)",
    pickupInstructions: "Pick up in person or send a dispatch rider. Present your order number SG-XXXXX and 4-digit PIN at the ground floor exit desk.",
    image: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=800&q=80",
    bannerImage: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80",
    coordinates: { lat: 9.0512, lng: 7.4891 },
    isActive: true,
    totalDeals: 2,
  },
  {
    id: "store_market_square",
    name: "Market Square Supermarket",
    slug: "market-square-jabi",
    area: "Jabi",
    address: "Jabi Lake Mall, Bala Sokoto Way, Jabi, Abuja",
    phone: "+234 814 333 2211",
    rating: 4.8,
    reviewCount: 290,
    openHours: "9:00 AM – 9:00 PM (Daily)",
    pickupInstructions: "Pick up in person or send a dispatch rider. Present your order number SG-XXXXX and 4-digit PIN at the customer care desk.",
    image: "https://images.unsplash.com/photo-1543083477-4f785aeafaa9?auto=format&fit=crop&w=800&q=80",
    bannerImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    coordinates: { lat: 9.0745, lng: 7.4290 },
    isActive: true,
    totalDeals: 3,
  },
];

export const CATEGORIES: Category[] = [
  {
    id: "cat_dairy_eggs",
    name: "Dairy & Eggs",
    slug: "dairy-eggs",
    icon: "Milk",
    description: "Fresh milk, Greek yogurts, imported cheeses, butter, and farm eggs.",
    itemCount: 16,
    gradient: "from-sky-500/20 to-blue-600/10",
    bgLight: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    id: "cat_bakery",
    name: "Bakery & Bread",
    slug: "bakery-bread",
    icon: "Croissant",
    description: "Artisan sourdough, sliced toast, butter croissants, and brioche rolls.",
    itemCount: 12,
    gradient: "from-amber-500/20 to-orange-600/10",
    bgLight: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "cat_pantry",
    name: "Pantry & Grains",
    slug: "pantry-grains",
    icon: "Wheat",
    description: "Premium basmati rice, Italian pasta, oat flakes, cereals, and flour.",
    itemCount: 28,
    gradient: "from-emerald-500/20 to-teal-600/10",
    bgLight: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "cat_beverages",
    name: "Beverages & Juices",
    slug: "beverages-juices",
    icon: "Coffee",
    description: "Pure pressed juices, malt drinks, organic teas, ground coffee, and iced tea.",
    itemCount: 22,
    gradient: "from-purple-500/20 to-indigo-600/10",
    bgLight: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: "cat_snacks",
    name: "Snacks & Treats",
    slug: "snacks-treats",
    icon: "Cookie",
    description: "Imported chocolates, potato crisps, roasted cashews, biscuits, and energy bars.",
    itemCount: 19,
    gradient: "from-rose-500/20 to-pink-600/10",
    bgLight: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    id: "cat_canned",
    name: "Canned & Preserved",
    slug: "canned-preserved",
    icon: "Package",
    description: "Sardines in olive oil, sweetcorn, baked beans, corned beef, and peeled plum tomatoes.",
    itemCount: 14,
    gradient: "from-yellow-500/20 to-amber-600/10",
    bgLight: "bg-yellow-50 text-yellow-800 border-yellow-200",
  },
  {
    id: "cat_condiments",
    name: "Sauces & Spreads",
    slug: "sauces-spreads",
    icon: "Flame",
    description: "Extra virgin olive oil, creamy mayonnaise, peanut butter, pasta sauces, and honey.",
    itemCount: 15,
    gradient: "from-red-500/20 to-orange-600/10",
    bgLight: "bg-red-50 text-red-700 border-red-200",
  },
  {
    id: "cat_frozen",
    name: "Frozen & Chilled",
    slug: "frozen-chilled",
    icon: "Snowflake",
    description: "Premium frozen chicken fillets, gourmet sausages, berry mix, and ice cream.",
    itemCount: 11,
    gradient: "from-cyan-500/20 to-blue-600/10",
    bgLight: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
];

interface RawProductData {
  id: string;
  name: string;
  brand: string;
  slug: string;
  category: string;
  storeId: string;
  description: string;
  unit: string;
  images: string[];
  originalPrice: number;
  baseDiscountPercent: number;
  dateType: "best_before" | "use_by" | "expiry";
  expiryDate: string; // YYYY-MM-DD
  listedAt: string; // YYYY-MM-DD
  driftRateWeekly?: number;
  stockQuantity: number;
  featured: boolean;
  storageCondition: "ambient" | "chilled" | "frozen";
  nafdacRegNo?: string;
  conditionNotes?: string;
  nutritionalHighlights?: string[];
}

const RAW_PRODUCTS: RawProductData[] = [
  {
    id: "sg_prod_001",
    name: "Peak Full Cream Milk Powder (Refill Pack)",
    brand: "Peak Milk",
    slug: "peak-full-cream-milk-powder-850g",
    category: "cat_dairy_eggs",
    storeId: "store_grand_square",
    description: "Rich, creamy 850g refill pouch fortified with 28 essential vitamins and minerals. Perfect for daily tea, coffee, breakfast cereal, and baking.",
    unit: "850g Pouch",
    images: ["https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 8500,
    baseDiscountPercent: 35,
    dateType: "best_before",
    expiryDate: "2026-09-12",
    listedAt: "2026-08-18",
    driftRateWeekly: 0.025,
    stockQuantity: 9,
    featured: true,
    storageCondition: "ambient",
    nafdacRegNo: "01-0024",
    conditionNotes: "Factory sealed, outer cardboard outer box slightly creased.",
    nutritionalHighlights: ["Fortified with Vitamin A & D", "Rich Calcium Source", "28g Protein per 100g"],
  },
  {
    id: "sg_prod_002",
    name: "Kellogg's Corn Flakes Original Family Pack",
    brand: "Kellogg's",
    slug: "kelloggs-corn-flakes-750g",
    category: "cat_pantry",
    storeId: "store_h_medix",
    description: "Crispy, golden toasted corn flakes made from sun-ripened corn. Iron and B-vitamin rich morning fuel for the entire family.",
    unit: "750g Box",
    images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 6200,
    baseDiscountPercent: 40,
    dateType: "best_before",
    expiryDate: "2026-09-08",
    listedAt: "2026-08-11",
    driftRateWeekly: 0.025,
    stockQuantity: 5,
    featured: true,
    storageCondition: "ambient",
    nafdacRegNo: "01-1456",
    conditionNotes: "Pristine inner foil seal intact.",
    nutritionalHighlights: ["High Iron", "Vitamin B1, B2, B3, B6, B12", "Low Fat"],
  },
  {
    id: "sg_prod_003",
    name: "Nutella Hazelnut Spread with Cocoa",
    brand: "Ferrero",
    slug: "nutella-hazelnut-spread-750g",
    category: "cat_condiments",
    storeId: "store_next_cash_carry",
    description: "Iconic creamy spread made with selected roasted hazelnuts and skimmed milk. Heavenly on toasted bread, pancakes, or fruit slices.",
    unit: "750g Glass Jar",
    images: ["https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 9800,
    baseDiscountPercent: 45,
    dateType: "best_before",
    expiryDate: "2026-09-06",
    listedAt: "2026-08-04",
    driftRateWeekly: 0.025,
    stockQuantity: 3,
    featured: true,
    storageCondition: "ambient",
    nafdacRegNo: "01-7890",
    conditionNotes: "Gold foil under lid 100% factory sealed.",
    nutritionalHighlights: ["No Artificial Colors", "No Preservatives", "Real Hazelnuts"],
  },
  {
    id: "sg_prod_004",
    name: "Barilla Spaghetti No. 5 (Pack of 3)",
    brand: "Barilla",
    slug: "barilla-spaghetti-pack-of-3",
    category: "cat_pantry",
    storeId: "store_4u",
    description: "Authentic Italian durum wheat semolina pasta that holds al dente texture every time. Bundle of 3 x 500g boxes.",
    unit: "3 x 500g Pack",
    images: ["https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 7500,
    baseDiscountPercent: 30,
    dateType: "best_before",
    expiryDate: "2026-09-25",
    listedAt: "2026-08-20",
    driftRateWeekly: 0.025,
    stockQuantity: 14,
    featured: false,
    storageCondition: "ambient",
    nafdacRegNo: "01-4432",
    conditionNotes: "Original imported packaging, perfect condition.",
    nutritionalHighlights: ["100% Durum Semolina", "Non-GMO Project Verified", "12g Protein"],
  },
  {
    id: "sg_prod_005",
    name: "Chi Exotic Pineapple & Coconut Nectar",
    brand: "Chi",
    slug: "chi-exotic-pineapple-coconut-1l",
    category: "cat_beverages",
    storeId: "store_grand_square",
    description: "Tropical island fusion of luscious pineapple juice with refreshing creamy coconut extract in 1-Litre Tetra Pak.",
    unit: "1L Tetra Pak",
    images: ["https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 1900,
    baseDiscountPercent: 35,
    dateType: "best_before",
    expiryDate: "2026-09-10",
    listedAt: "2026-08-15",
    driftRateWeekly: 0.025,
    stockQuantity: 20,
    featured: false,
    storageCondition: "ambient",
    nafdacRegNo: "01-2289",
    conditionNotes: "Refrigerate once opened.",
    nutritionalHighlights: ["Natural Fruit Sugars", "Vitamin C Enriched"],
  },
  {
    id: "sg_prod_006",
    name: "Lurpak Slightly Salted Danish Butter",
    brand: "Lurpak",
    slug: "lurpak-slightly-salted-butter-200g",
    category: "cat_dairy_eggs",
    storeId: "store_h_medix",
    description: "Legendary Danish churned butter made from fresh cream. Unmistakably rich taste with just a pinch of salt.",
    unit: "200g Foil Block",
    images: ["https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 4200,
    baseDiscountPercent: 50,
    dateType: "use_by",
    expiryDate: "2026-09-05",
    listedAt: "2026-08-01",
    driftRateWeekly: 0.025,
    stockQuantity: 4,
    featured: true,
    storageCondition: "chilled",
    nafdacRegNo: "01-9011",
    conditionNotes: "Continuous chilled storage maintained at H-Medix Wuse II.",
    nutritionalHighlights: ["100% Pure Danish Cream", "No Palm Oil"],
  },
  {
    id: "sg_prod_007",
    name: "Titus Sardines in Pure Vegetable Oil (Pack of 5)",
    brand: "Titus",
    slug: "titus-sardines-pack-of-5",
    category: "cat_canned",
    storeId: "store_sahad",
    description: "Classic wild-caught Atlantic sardines packed with heart-healthy Omega-3 fatty acids and protein. Bundle of 5 cans with easy pull-tab.",
    unit: "5 x 125g Cans",
    images: ["https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 6500,
    baseDiscountPercent: 30,
    dateType: "best_before",
    expiryDate: "2026-09-30",
    listedAt: "2026-08-25",
    driftRateWeekly: 0.025,
    stockQuantity: 18,
    featured: false,
    storageCondition: "ambient",
    nafdacRegNo: "01-0088",
    conditionNotes: "Undamaged cans, zero denting.",
    nutritionalHighlights: ["High Omega-3", "22g Protein per can", "Calcium Rich"],
  },
  {
    id: "sg_prod_008",
    name: "Grand Square Fresh Brioche Burger Buns (6-Pack)",
    brand: "Grand Square In-House Bakery",
    slug: "grand-square-brioche-burger-buns-6pack",
    category: "cat_bakery",
    storeId: "store_grand_square",
    description: "Golden, buttery, glazed French brioche burger buns baked daily in-store. Pillowy soft crumb that toasts to perfection.",
    unit: "Pack of 6 Buns",
    images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 3200,
    baseDiscountPercent: 55,
    dateType: "best_before",
    expiryDate: "2026-09-04",
    listedAt: "2026-08-29",
    driftRateWeekly: 0.025,
    stockQuantity: 6,
    featured: true,
    storageCondition: "ambient",
    conditionNotes: "Freshly bagged, best consumed or frozen within 3 days.",
    nutritionalHighlights: ["Pure Butter Glaze", "Artisan Baked"],
  },
  {
    id: "sg_prod_009",
    name: "Heinz Classic Tomato Ketchup (Top Down)",
    brand: "Heinz",
    slug: "heinz-classic-tomato-ketchup-570g",
    category: "cat_condiments",
    storeId: "store_next_cash_carry",
    description: "Thick and rich tomato ketchup grown from Heinz signature seeds. Squeezable non-drip bottle.",
    unit: "570g Squeeze Bottle",
    images: ["https://images.unsplash.com/photo-1527842891421-42eec6e703ea?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 4800,
    baseDiscountPercent: 35,
    dateType: "best_before",
    expiryDate: "2026-09-18",
    listedAt: "2026-08-14",
    driftRateWeekly: 0.025,
    stockQuantity: 11,
    featured: false,
    storageCondition: "ambient",
    nafdacRegNo: "01-5612",
    conditionNotes: "Original factory seal intact.",
    nutritionalHighlights: ["No Artificial Flavors", "Sun-Ripened Tomatoes"],
  },
  {
    id: "sg_prod_010",
    name: "Milo Energy Food Drink Powder (Refill Tin)",
    brand: "Nestlé",
    slug: "nestle-milo-energy-drink-1kg",
    category: "cat_beverages",
    storeId: "store_sahad",
    description: "Malted barley and cocoa beverage loaded with Activ-Go (Protomalt, 6 vitamins & 3 minerals) to give kids and adults winning energy.",
    unit: "1kg Tin",
    images: ["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 7900,
    baseDiscountPercent: 38,
    dateType: "best_before",
    expiryDate: "2026-09-15",
    listedAt: "2026-08-10",
    driftRateWeekly: 0.025,
    stockQuantity: 8,
    featured: true,
    storageCondition: "ambient",
    nafdacRegNo: "01-0005",
    conditionNotes: "Vacuum sealed foil lid under tin cap.",
    nutritionalHighlights: ["Activ-Go Nutrient Complex", "B-Vitamins for Energy Release"],
  },
  {
    id: "sg_prod_011",
    name: "Oreo Original Vanilla Creme Sandwich Cookies",
    brand: "Cadbury / Mondelez",
    slug: "oreo-original-vanilla-creme-family-pack",
    category: "cat_snacks",
    storeId: "store_4u",
    description: "The classic rich chocolate wafer cookies with a sweet vanilla creme center. Perfect for twisting, licking, and dunking in cold milk.",
    unit: "345g Family Pack",
    images: ["https://images.unsplash.com/photo-1568051243851-f9b136146e97?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 3800,
    baseDiscountPercent: 40,
    dateType: "best_before",
    expiryDate: "2026-09-09",
    listedAt: "2026-08-12",
    driftRateWeekly: 0.025,
    stockQuantity: 12,
    featured: false,
    storageCondition: "ambient",
    nafdacRegNo: "01-3341",
    conditionNotes: "Crisp and fresh.",
    nutritionalHighlights: ["Plant-Based Friendly", "Real Cocoa"],
  },
  {
    id: "sg_prod_012",
    name: "Zartech Premium Farm Fresh Whole Chicken (Frozen)",
    brand: "Zartech",
    slug: "zartech-frozen-whole-chicken-1-3kg",
    category: "cat_frozen",
    storeId: "store_market_square",
    description: "Dressed, cleaned, and blast-frozen premium Nigerian poultry. Hormone-free, juicy, and ideal for roasting, pepper soup, or grilling.",
    unit: "1.3kg Whole Bird",
    images: ["https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 8900,
    baseDiscountPercent: 45,
    dateType: "use_by",
    expiryDate: "2026-09-07",
    listedAt: "2026-08-08",
    driftRateWeekly: 0.025,
    stockQuantity: 7,
    featured: true,
    storageCondition: "frozen",
    nafdacRegNo: "01-8840",
    conditionNotes: "Maintained at -18°C in Market Square deep freeze.",
    nutritionalHighlights: ["100% Grain Fed", "High Protein", "No Added Water"],
  },
  {
    id: "sg_prod_013",
    name: "Gino Magic Seasoning Curry & Thyme Herbal Blend",
    brand: "Gino",
    slug: "gino-magic-seasoning-blend-pack",
    category: "cat_condiments",
    storeId: "store_h_medix",
    description: "Aromatic blend of turmeric, dried coriander, thyme leaves, and garlic flakes. Adds authentic Nigerian jollof & stew vibrancy.",
    unit: "400g Jar",
    images: ["https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 2800,
    baseDiscountPercent: 30,
    dateType: "best_before",
    expiryDate: "2026-09-28",
    listedAt: "2026-08-20",
    driftRateWeekly: 0.025,
    stockQuantity: 15,
    featured: false,
    storageCondition: "ambient",
    nafdacRegNo: "01-6543",
    conditionNotes: "Dry spice jar with foil induction seal.",
    nutritionalHighlights: ["Natural Herbs", "No Preservatives"],
  },
  {
    id: "sg_prod_014",
    name: "Quaker Quick Cooking White Rolled Oats",
    brand: "Quaker",
    slug: "quaker-quick-cooking-rolled-oats-1kg",
    category: "cat_pantry",
    storeId: "store_grand_square",
    description: "100% whole grain Canadian oats that cook in just 3 minutes. Rich in beta-glucan soluble fiber to help lower cholesterol.",
    unit: "1kg Tub",
    images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 5600,
    baseDiscountPercent: 35,
    dateType: "best_before",
    expiryDate: "2026-09-19",
    listedAt: "2026-08-16",
    driftRateWeekly: 0.025,
    stockQuantity: 10,
    featured: false,
    storageCondition: "ambient",
    nafdacRegNo: "01-1190",
    conditionNotes: "Factory fresh sealed tub.",
    nutritionalHighlights: ["Heart Healthy Beta-Glucan", "100% Whole Grain", "Energy Sustaining"],
  },
  {
    id: "sg_prod_015",
    name: "Twinings English Breakfast Pure Black Tea",
    brand: "Twinings London",
    slug: "twinings-english-breakfast-tea-50bags",
    category: "cat_beverages",
    storeId: "store_4u",
    description: "Famous golden and well-rounded master tea blend with body and briskness. 50 individual foil-enveloped tea bags.",
    unit: "50 Tea Bags Box",
    images: ["https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 4500,
    baseDiscountPercent: 40,
    dateType: "best_before",
    expiryDate: "2026-09-14",
    listedAt: "2026-08-10",
    driftRateWeekly: 0.025,
    stockQuantity: 8,
    featured: false,
    storageCondition: "ambient",
    nafdacRegNo: "01-9921",
    conditionNotes: "Pristine box condition.",
    nutritionalHighlights: ["Antioxidant Rich", "Ethical Tea Partnership"],
  },
  {
    id: "sg_prod_016",
    name: "Golden Penny Semovita Super Fine Wheat",
    brand: "Flour Mills of Nigeria",
    slug: "golden-penny-semovita-2kg",
    category: "cat_pantry",
    storeId: "store_market_square",
    description: "Premium enriched semolina milled from superior quality hard wheat. Smooth, easy to swallow, and molds effortlessly for traditional soups.",
    unit: "2kg Bag",
    images: ["https://images.unsplash.com/photo-1543083477-4f785aeafaa9?auto=format&fit=crop&w=800&q=80"],
    originalPrice: 4900,
    baseDiscountPercent: 30,
    dateType: "best_before",
    expiryDate: "2026-09-22",
    listedAt: "2026-08-19",
    driftRateWeekly: 0.025,
    stockQuantity: 16,
    featured: false,
    storageCondition: "ambient",
    nafdacRegNo: "01-0112",
    conditionNotes: "Heavy duty airtight packaging intact.",
    nutritionalHighlights: ["Fortified with Vitamin A", "Fiber Rich"],
  },
];

/**
 * Builds fully hydrated products with calculated drift pricing schedules and days remaining
 */
export function getProducts(): Product[] {
  return RAW_PRODUCTS.map((raw) => {
    const daysRemaining = getDaysRemaining(raw.expiryDate);
    const driftResult = calculateDriftPrice({
      originalPrice: raw.originalPrice,
      baseDiscountPercent: raw.baseDiscountPercent,
      listedAt: raw.listedAt,
      weeklyDriftRate: raw.driftRateWeekly ?? 0.025,
    });

    const driftSchedule = generateDriftSchedule({
      originalPrice: raw.originalPrice,
      baseDiscountPercent: raw.baseDiscountPercent,
      listedAt: raw.listedAt,
      expiryDate: raw.expiryDate,
      weeklyDriftRate: raw.driftRateWeekly ?? 0.025,
    });

    return {
      ...raw,
      daysRemaining,
      currentPrice: driftResult.currentPrice,
      discountPercent: driftResult.totalDiscountPercent,
      driftRateWeekly: raw.driftRateWeekly ?? 0.025,
      driftSchedule,
      isAvailable: raw.stockQuantity > 0 && daysRemaining > 0,
    };
  });
}

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

export const STORE_REVIEWS: Record<string, StoreReviewData> = {
  store_grand_square: {
    freshnessScore: 4.9,
    handoffSpeedScore: 4.8,
    cleanlinessScore: 4.9,
    reviews: [
      {
        id: "rev_1",
        customerName: "Emeka O.",
        rating: 5,
        date: "Yesterday",
        comment: "Sent a dispatch rider with my SG order code. The bag was already packed and sealed with cold items chilled. Super seamless!",
        verifiedPickup: true,
        userType: "Customer",
      },
      {
        id: "rev_2",
        customerName: "Rider Ibrahim (Max NG)",
        rating: 5,
        date: "3 days ago",
        comment: "Very fast pickup at the Stillgood Express desk. Verified the 4-digit code in 30 seconds. No delay for riders.",
        verifiedPickup: true,
        userType: "Dispatch Rider",
      },
      {
        id: "rev_3",
        customerName: "Fatima D.",
        rating: 4.8,
        date: "Last week",
        comment: "Saved over 45% on Peak milk and brioche buns. Best before dates were exactly as shown on the app.",
        verifiedPickup: true,
        userType: "Customer",
      },
    ],
  },
  store_h_medix: {
    freshnessScore: 4.9,
    handoffSpeedScore: 4.9,
    cleanlinessScore: 5.0,
    reviews: [
      {
        id: "rev_4",
        customerName: "Zainab A.",
        rating: 5,
        date: "2 days ago",
        comment: "H-Medix Wuse II staff were very polite. The Lurpak butter was kept in deep refrigeration until I arrived.",
        verifiedPickup: true,
        userType: "Customer",
      },
      {
        id: "rev_5",
        customerName: "Rider Samuel (Gokada)",
        rating: 4.9,
        date: "4 days ago",
        comment: "Quick customer service counter pickup. Code validation works instantly.",
        verifiedPickup: true,
        userType: "Dispatch Rider",
      },
    ],
  },
  store_next_cash_carry: {
    freshnessScore: 4.7,
    handoffSpeedScore: 4.6,
    cleanlinessScore: 4.8,
    reviews: [
      {
        id: "rev_6",
        customerName: "Chidi N.",
        rating: 5,
        date: "5 days ago",
        comment: "Entrance B pickup was so organized. Nutella jar in pristine condition at 45% off retail.",
        verifiedPickup: true,
        userType: "Customer",
      },
    ],
  },
  store_4u: {
    freshnessScore: 4.8,
    handoffSpeedScore: 4.7,
    cleanlinessScore: 4.7,
    reviews: [
      {
        id: "rev_7",
        customerName: "Amina K.",
        rating: 5,
        date: "3 days ago",
        comment: "Sent my rider to 4U in Wuse II. Smooth handoff with the manager.",
        verifiedPickup: true,
        userType: "Customer",
      },
    ],
  },
  store_sahad: {
    freshnessScore: 4.8,
    handoffSpeedScore: 4.7,
    cleanlinessScore: 4.8,
    reviews: [
      {
        id: "rev_8",
        customerName: "Bello M.",
        rating: 5,
        date: "6 days ago",
        comment: "Milo and Titus sardines well packed. Ground floor counter is easy to find.",
        verifiedPickup: true,
        userType: "Customer",
      },
    ],
  },
  store_market_square: {
    freshnessScore: 4.9,
    handoffSpeedScore: 4.8,
    cleanlinessScore: 4.9,
    reviews: [
      {
        id: "rev_9",
        customerName: "Kelechi U.",
        rating: 5,
        date: "Yesterday",
        comment: "Frozen Zartech chicken was rock solid frozen upon collection. Very impressed with the cold storage.",
        verifiedPickup: true,
        userType: "Customer",
      },
    ],
  },
};

export function getStoreReviews(storeId: string): StoreReviewData {
  return (
    STORE_REVIEWS[storeId] || {
      freshnessScore: 4.8,
      handoffSpeedScore: 4.8,
      cleanlinessScore: 4.8,
      reviews: [
        {
          id: "rev_default",
          customerName: "Verified Shopper",
          rating: 5,
          date: "Recently",
          comment: "Seamless pickup handoff with 4-digit verification code. Dispatch rider was cleared immediately.",
          verifiedPickup: true,
          userType: "Customer",
        },
      ],
    }
  );
}

export function getProductById(id: string): Product | undefined {
  return getProducts().find((p) => p.id === id || p.slug === id);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const others = getProducts().filter((p) => p.id !== product.id);
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

export function getStores(): Store[] {
  const products = getProducts();
  return STORES.map((s) => ({
    ...s,
    totalDeals: products.filter((p) => p.storeId === s.id).length,
  }));
}

export function getStoreById(id: string): Store | undefined {
  return getStores().find((s) => s.id === id || s.slug === id);
}

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id || c.slug === id);
}

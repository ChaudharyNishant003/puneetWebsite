// Single source of truth for switchable features. The ops console renders this list and every
// check in the code (admin pages, admin actions, storefront) looks up the same keys, so the two
// can never drift apart. `admin` / `site` say which side has something to switch.

export type FeatureDef = {
  key: string;
  group: string;
  label: string;
  admin?: string; // what disappears in the admin panel when the admin switch is OFF
  site?: string; // what disappears on the website when the site switch is OFF
  core?: boolean; // the shop can't really operate without it — console warns before turning off
};

export const FEATURE_GROUPS = ["Orders & Delivery", "Products & Catalogue", "Shopping Experience", "Checkout & Payment", "After the Order", "Store Management"] as const;

export const FEATURES: FeatureDef[] = [
  // Orders & Delivery
  { key: "dashboard", group: "Orders & Delivery", label: "Dashboard", admin: "Sales/pending/low-stock tiles on the admin home page" },
  { key: "orders", group: "Orders & Delivery", label: "Orders management", admin: "Orders menu, order pages and all order actions", core: true },
  { key: "courier", group: "Orders & Delivery", label: "Courier delivery (Shiprocket)", admin: "\"Book courier & ship\" button", site: "Delivery outside local pincodes (OFF = only local pincodes are served)" },
  { key: "manualAwb", group: "Orders & Delivery", label: "Manual AWB entry", admin: "\"Shipped outside the system\" box" },
  { key: "localDelivery", group: "Orders & Delivery", label: "Local delivery (own team)", admin: "\"Send out for local delivery\" button", site: "Own delivery with local fee/ETA (OFF = local pincodes treated as courier)" },
  { key: "orderCancel", group: "Orders & Delivery", label: "Cancel / refund marking", admin: "\"Cancel order\" and \"Mark refunded\" buttons" },
  { key: "orderNotes", group: "Orders & Delivery", label: "Internal order notes", admin: "Note box on the order page" },
  { key: "invoice", group: "Orders & Delivery", label: "Invoice PDF", admin: "\"Invoice PDF\" button", site: "Customer \"Download invoice\" link" },
  { key: "codRto", group: "Orders & Delivery", label: "COD block after returns (RTO)", admin: "\"Re-enable COD\" for a customer", site: "Automatic COD block after repeated RTO" },

  // Products & Catalogue
  { key: "products", group: "Products & Catalogue", label: "Products add / edit", admin: "Products menu, product pages and actions", core: true },
  { key: "stockGrid", group: "Products & Catalogue", label: "Stock grid (size × colour)", admin: "Sizes, colours & stock section" },
  { key: "photos", group: "Products & Catalogue", label: "Photo upload", admin: "Photos section on the product page" },
  { key: "video", group: "Products & Catalogue", label: "Product video", admin: "Video upload", site: "\"Watch video\" on product page" },
  { key: "csvImport", group: "Products & Catalogue", label: "CSV bulk import", admin: "Bulk import box" },
  { key: "csvExport", group: "Products & Catalogue", label: "CSV export", admin: "\"Export CSV\" button and download" },
  { key: "productDetails", group: "Products & Catalogue", label: "Product details table", admin: "Fabric/lining/care fields", site: "Details table on product page" },
  { key: "sizeChart", group: "Products & Catalogue", label: "Size chart", site: "\"Size Chart\" button and fit rule" },
  { key: "badges", group: "Products & Catalogue", label: "Badges (New / Bestseller)", admin: "Badges field", site: "Badge on product cards" },
  { key: "seo", group: "Products & Catalogue", label: "SEO fields", admin: "SEO section on product form" },

  // Shopping Experience
  { key: "smartSearch", group: "Shopping Experience", label: "Smart Hinglish search", admin: "\"Search words\" editor", site: "Hinglish understanding + typo fix (OFF = plain name search)" },
  { key: "searchSuggest", group: "Shopping Experience", label: "Search suggestions", site: "Live suggestions while typing" },
  { key: "filters", group: "Shopping Experience", label: "Filters", site: "Filter button on collections" },
  { key: "sort", group: "Shopping Experience", label: "Sort", site: "Sort button on collections" },
  { key: "occasionBudget", group: "Shopping Experience", label: "Occasion & budget collections", site: "Occasion/budget tiles, menu sections and pages" },
  { key: "quickAdd", group: "Shopping Experience", label: "Quick Add", site: "Quick Add on product cards" },
  { key: "wishlist", group: "Shopping Experience", label: "Wishlist", site: "Heart buttons, wishlist page and nav item" },
  { key: "recentlyViewed", group: "Shopping Experience", label: "Recently viewed", site: "Recently viewed rail" },
  { key: "similar", group: "Shopping Experience", label: "Similar products", site: "\"You may also like\" rail" },
  { key: "pincodeCheck", group: "Shopping Experience", label: "Pincode delivery-date check", site: "\"Check delivery\" on product page" },
  { key: "share", group: "Shopping Experience", label: "Share button", site: "Share on product page" },
  { key: "storePage", group: "Shopping Experience", label: "Visit Store page", site: "Store page, homepage block and nav items" },

  // Checkout & Payment
  { key: "coupons", group: "Checkout & Payment", label: "Coupons", admin: "Coupons menu", site: "Coupon box in bag, offers box, coupon discount" },
  { key: "prepaidDiscount", group: "Checkout & Payment", label: "Prepaid discount", admin: "Prepaid fields in Settings", site: "Extra discount for online payment" },
  { key: "cod", group: "Checkout & Payment", label: "Cash on Delivery", admin: "COD fields in Settings", site: "COD payment option" },
  { key: "codOtp", group: "Checkout & Payment", label: "COD OTP for another phone", site: "OTP step when delivery phone differs" },
  { key: "onlinePayment", group: "Checkout & Payment", label: "Online payment (UPI / Card)", site: "Razorpay option (OFF = COD only)" },
  { key: "savedAddresses", group: "Checkout & Payment", label: "Saved addresses", site: "Address book at checkout and in account" },
  { key: "freeShipBar", group: "Checkout & Payment", label: "Free-shipping progress bar", site: "Green progress bar in the bag" },

  // After the Order
  { key: "exchanges", group: "After the Order", label: "Size exchange", admin: "Exchanges menu", site: "\"Exchange size\" on order page" },
  { key: "reviews", group: "After the Order", label: "Reviews", admin: "Reviews menu", site: "Ratings, reviews section and writing reviews" },
  { key: "photoReviews", group: "After the Order", label: "Photo reviews", site: "Photo upload in reviews and homepage reviews strip" },
  { key: "sms", group: "After the Order", label: "SMS notifications", site: "Order / shipping / delivery SMS" },
  { key: "email", group: "After the Order", label: "Email notifications", site: "Order emails" },
  { key: "tracking", group: "After the Order", label: "Order tracking", site: "Progress line and courier/AWB on order page" },

  // Store Management
  { key: "pincodes", group: "Store Management", label: "Pincodes management", admin: "Pincodes menu" },
  { key: "announcement", group: "Store Management", label: "Announcement bar", admin: "Announcement editor", site: "Top announcement strip" },
  { key: "heroEditor", group: "Store Management", label: "Hero banner editor", admin: "Main banner editor" },
  { key: "railsEditor", group: "Store Management", label: "Homepage rails editor", admin: "Rails editor" },
  { key: "settings", group: "Store Management", label: "Settings", admin: "Settings menu (owner)" },
  { key: "reports", group: "Store Management", label: "Reports", admin: "Reports menu (owner)" },
  { key: "users", group: "Store Management", label: "Users & staff", admin: "Users menu (owner)" },
  { key: "activityLog", group: "Store Management", label: "Admin activity log", admin: "Activity list on Users page" },
];

export type FeatureKey = (typeof FEATURES)[number]["key"];
export type Side = "admin" | "site";

export const featureByKey = new Map(FEATURES.map((f) => [f.key, f]));
export const switchCount = FEATURES.reduce((n, f) => n + (f.admin ? 1 : 0) + (f.site ? 1 : 0), 0);

// Admin "Homepage & Search" page is shown while any of its parts is ON.
export const CONTENT_PARTS = ["announcement", "heroEditor", "railsEditor", "smartSearch"];

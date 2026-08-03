export type OrderMode = "retail" | "bulk";
export type OrderStatus =
  | "pending_agent"
  | "confirmed"
  | "out_for_delivery"
  | "delivered"
  | "rejected";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** Price per kg in INR — editable in admin */
  pricePerKg: number;
  /** Bulk price per kg in INR (optional discount) */
  bulkPricePerKg: number;
  featured: boolean;
  category: "prawns" | "fish" | "crab" | "other";
  imageEmoji: string;
}

export interface ShopConfig {
  shopName: string;
  tagline: string;
  hubLat: number;
  hubLng: number;
  hubAddress: string;
  /** Max delivery radius (km) for orders under minKgForExtended */
  retailDeliveryRadiusKm: number;
  /**
   * Orders below this total weight need agent confirmation
   * and must be within retailDeliveryRadiusKm.
   * At/above this weight → auto-confirmed.
   */
  minKgForExtended: number;
  supportPhone: string;
  supportWhatsApp: string;
  supportEmail: string;
  /** Hours shown on contact */
  supportHours: string;
  /** Admin portal credentials — change in Admin → Settings */
  adminUsername: string;
  adminPassword: string;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

export interface SavedLocation {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export interface CustomerAccount {
  id: string;
  phone: string;
  name: string;
  savedLocations: SavedLocation[];
  createdAt: string;
  lastLoginAt: string;
}

export interface OrderLineItem {
  productId: string;
  productName: string;
  mode: OrderMode;
  /** Quantity in kg (supports decimals e.g. 4.5) */
  quantityKg: number;
  pricePerKg: number;
  lineTotalInr: number;
}

export interface CustomerOrder {
  id: string;
  createdAt: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  /** Line items (multi-product cart) */
  items: OrderLineItem[];
  /** Summary for list views */
  productId: string;
  productName: string;
  mode: OrderMode;
  /** Total quantity across all items (kg) */
  quantityKg: number;
  /** Weighted / primary rate — prefer reading items */
  pricePerKg: number;
  totalInr: number;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  status: OrderStatus;
  agentNote?: string;
  deliveryPartnerId?: string;
  trackingCode: string;
}

export interface AppState {
  products: Product[];
  config: ShopConfig;
  partners: DeliveryPartner[];
  orders: CustomerOrder[];
  customers: CustomerAccount[];
}

export interface PendingOtp {
  phone: string;
  code: string;
  expiresAt: number;
}

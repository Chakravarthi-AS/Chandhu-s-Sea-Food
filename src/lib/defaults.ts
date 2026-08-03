import type { AppState } from "./types";

/** Demo defaults — replace prices later in Admin → Prices */
export const DEFAULT_STATE: AppState = {
  config: {
    shopName: "Chandhu Sea Food",
    tagline: "Fresh prawns from Nellore — never frozen",
    // Tiruchanoor hub — opposite DCC Bank / near Navajeevan
    hubLat: 13.6102,
    hubLng: 79.4485,
    hubAddress:
      "Opposite to DCC Bank and near Navajeevan, Tiruchanoor, 517503",
    retailDeliveryRadiusKm: 10,
    minKgForExtended: 2,
    supportPhone: "+91 98765 43210",
    supportWhatsApp: "+91 98765 43210",
    supportEmail: "help@chandhuseafood.in",
    supportHours: "Daily 7:00 AM – 9:00 PM IST",
    adminUsername: "admin",
    adminPassword: "chandhu@123",
  },
  products: [
    {
      id: "prawn-vanamei",
      name: "Vannamei Prawns",
      slug: "vannamei-prawns",
      description:
        "Our hero catch — peeled & cleaned daily by our team. Fresh from Nellore farms, never frozen.",
      pricePerKg: 480,
      bulkPricePerKg: 430,
      featured: true,
      category: "prawns",
      imageEmoji: "🦐",
    },
    {
      id: "prawn-tiger",
      name: "Tiger Prawns",
      slug: "tiger-prawns",
      description:
        "Large tiger prawns, hygienically cleaned in-house. Ideal for curries and grills.",
      pricePerKg: 620,
      bulkPricePerKg: 560,
      featured: true,
      category: "prawns",
      imageEmoji: "🦐",
    },
    {
      id: "prawn-jumbo",
      name: "Jumbo Prawns",
      slug: "jumbo-prawns",
      description:
        "Premium jumbo size for celebrations and restaurants. Same-day Nellore import.",
      pricePerKg: 780,
      bulkPricePerKg: 700,
      featured: true,
      category: "prawns",
      imageEmoji: "🦐",
    },
    {
      id: "fish-rohu",
      name: "Rohu (Fresh Cut)",
      slug: "rohu",
      description: "Daily cut by our staff. Clean, ice-packed, ready to cook.",
      pricePerKg: 280,
      bulkPricePerKg: 250,
      featured: false,
      category: "fish",
      imageEmoji: "🐟",
    },
    {
      id: "crab-mud",
      name: "Mud Crab",
      slug: "mud-crab",
      description: "Live / fresh mud crab sourced with our Nellore network.",
      pricePerKg: 520,
      bulkPricePerKg: 470,
      featured: false,
      category: "crab",
      imageEmoji: "🦀",
    },
  ],
  partners: [
    {
      id: "dp-1",
      name: "Ravi Kumar",
      phone: "+91 90000 11111",
      active: true,
    },
    {
      id: "dp-2",
      name: "Suresh Naidu",
      phone: "+91 90000 22222",
      active: true,
    },
    {
      id: "dp-3",
      name: "Anil Reddy",
      phone: "+91 90000 33333",
      active: false,
    },
  ],
  orders: [],
  customers: [],
};

export const RETAIL_STEPS_KG = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10];

/** Whole kilograms for retail dropdown (pair with grams) */
export const RETAIL_KG_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Gram variations — e.g. 4 kg + 500 g = 4.5 kg */
export const RETAIL_GRAM_OPTIONS = [0, 100, 200, 250, 500, 750];

export function qtyFromKgGrams(kg: number, grams: number): number {
  return Math.round((kg + grams / 1000) * 1000) / 1000;
}

export function formatQtyParts(totalKg: number): string {
  if (totalKg >= 1000) {
    const t = totalKg / 1000;
    return `${t % 1 === 0 ? t.toFixed(0) : t.toFixed(2)} ton${t === 1 ? "" : "s"}`;
  }
  const whole = Math.floor(totalKg + 1e-9);
  const grams = Math.round((totalKg - whole) * 1000);
  if (grams === 0) return `${whole} kg`;
  if (whole === 0) return `${grams} g`;
  return `${whole} kg ${grams} g`;
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Bulk UI helpers: store everything in kg */
export function tonsToKg(tons: number): number {
  return tons * 1000;
}

export function kgLabel(kg: number): string {
  if (kg >= 1000) {
    const t = kg / 1000;
    return `${t % 1 === 0 ? t.toFixed(0) : t.toFixed(2)} ton${t === 1 ? "" : "s"} (${kg.toLocaleString("en-IN")} kg)`;
  }
  const rounded = Math.round(kg * 1000) / 1000;
  if (Number.isInteger(rounded)) return `${rounded} kg`;
  return formatQtyParts(rounded);
}

/** Normalize Indian mobile to digits-only 10-digit form when possible */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function formatPhoneDisplay(phone: string): string {
  const n = normalizePhone(phone);
  if (n.length === 10) return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
  return phone.trim();
}

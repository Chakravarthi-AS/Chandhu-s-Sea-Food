import type { Product } from "./types";

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_per_kg: number;
  bulk_price_per_kg: number;
  featured: boolean;
  category: string;
  image_emoji: string;
  active: boolean;
};

export function productToRow(p: Product): ProductRow {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description ?? "",
    price_per_kg: p.pricePerKg,
    bulk_price_per_kg: p.bulkPricePerKg,
    featured: p.featured,
    category: p.category,
    image_emoji: p.imageEmoji ?? "",
    active: p.active !== false,
  };
}

export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    pricePerKg: row.price_per_kg,
    bulkPricePerKg: row.bulk_price_per_kg,
    featured: row.featured,
    category: row.category as Product["category"],
    imageEmoji: row.image_emoji ?? "",
    active: row.active !== false,
  };
}

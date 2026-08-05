import type { Product } from "./types";
import { adminHeaders } from "./admin-api";

export type ProductsApiResponse = {
  configured: boolean;
  products: Product[];
};

export async function fetchProductsFromServer(): Promise<ProductsApiResponse> {
  const res = await fetch("/api/products", { cache: "no-store" });
  const data = (await res.json()) as ProductsApiResponse & { error?: string };
  if (!res.ok) {
    return { configured: false, products: [] };
  }
  return {
    configured: Boolean(data.configured),
    products: Array.isArray(data.products) ? data.products : [],
  };
}

export async function upsertProductOnServer(product: Product): Promise<boolean> {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(product),
  });
  return res.ok;
}

export async function removeProductOnServer(id: string): Promise<boolean> {
  const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  return res.ok;
}

export async function replaceProductsOnServer(
  products: Product[]
): Promise<boolean> {
  const res = await fetch("/api/products", {
    method: "PUT",
    headers: adminHeaders(),
    body: JSON.stringify({ products }),
  });
  return res.ok;
}

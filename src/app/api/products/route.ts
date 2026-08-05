import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_STATE } from "@/lib/defaults";
import { productToRow, rowToProduct } from "@/lib/product-db";
import type { Product } from "@/lib/types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function verifyAdminSecret(secret: string | null): boolean {
  if (!secret) return false;
  const fromEnv =
    process.env.ADMIN_API_SECRET ??
    process.env.ADMIN_PASSWORD ??
    DEFAULT_STATE.config.adminPassword;
  return secret === fromEnv;
}

async function listProducts(): Promise<Product[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  const rows = data ?? [];

  if (rows.length === 0) {
    const seed = DEFAULT_STATE.products.map(productToRow);
    const { error: seedError } = await supabase.from("products").upsert(seed);
    if (seedError) throw new Error(seedError.message);
    return DEFAULT_STATE.products;
  }

  return rows.map((row) => rowToProduct(row as ReturnType<typeof productToRow>));
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, products: [] });
  }

  try {
    const products = await listProducts();
    return NextResponse.json({ configured: true, products });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load products";
    return NextResponse.json({ configured: true, error: message, products: [] }, {
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Add Supabase env vars." },
      { status: 503 }
    );
  }

  const secret = req.headers.get("x-admin-secret");
  if (!verifyAdminSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let product: Product;
  try {
    product = (await req.json()) as Product;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const row = productToRow({ ...product, description: "", active: product.active !== false });
  const { error } = await supabase.from("products").upsert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, product: rowToProduct(row) });
}

export async function PUT(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Add Supabase env vars." },
      { status: 503 }
    );
  }

  const secret = req.headers.get("x-admin-secret");
  if (!verifyAdminSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { products?: Product[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const products = body.products;
  if (!Array.isArray(products)) {
    return NextResponse.json({ error: "products array required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const rows = products.map((p) =>
    productToRow({ ...p, description: "", active: p.active !== false })
  );

  const { error: delError } = await supabase
    .from("products")
    .delete()
    .not("id", "is", null);
  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("products").insert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, count: rows.length });
}

export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Add Supabase env vars." },
      { status: 503 }
    );
  }

  const secret = req.headers.get("x-admin-secret");
  if (!verifyAdminSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

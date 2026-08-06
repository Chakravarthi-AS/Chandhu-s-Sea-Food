import { NextRequest, NextResponse } from "next/server";
import { customerToRow, rowToCustomer } from "@/lib/customer-db";
import type { CustomerAccount } from "@/lib/types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-server";
import { normalizePhone } from "@/lib/defaults";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, customer: null });
  }

  const phone = normalizePhone(req.nextUrl.searchParams.get("phone") ?? "");
  if (phone.length !== 10) {
    return NextResponse.json({ error: "Valid phone query required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ configured: false, customer: null });
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    configured: true,
    customer: data ? rowToCustomer(data as ReturnType<typeof customerToRow>) : null,
  });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Add Supabase env vars." },
      { status: 503 }
    );
  }

  let customer: CustomerAccount;
  try {
    customer = (await req.json()) as CustomerAccount;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = normalizePhone(customer.phone);
  if (phone.length !== 10) {
    return NextResponse.json({ error: "Valid phone required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  // Prefer existing DB row for this phone so orders.customer_id FK stays valid.
  const { data: existing } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  const resolved: CustomerAccount = existing
    ? {
        ...customer,
        id: (existing as { id: string }).id,
        phone,
        createdAt:
          (existing as { created_at?: string }).created_at || customer.createdAt,
      }
    : { ...customer, phone };

  const row = customerToRow(resolved);
  const { error } = await supabase.from("customers").upsert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, customer: rowToCustomer(row) });
}

export async function PUT(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Add Supabase env vars." },
      { status: 503 }
    );
  }

  let customer: CustomerAccount;
  try {
    customer = (await req.json()) as CustomerAccount;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = normalizePhone(customer.phone);
  if (phone.length !== 10) {
    return NextResponse.json({ error: "Valid phone required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const row = customerToRow({ ...customer, phone });
  const { error } = await supabase.from("customers").upsert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, customer: rowToCustomer(row) });
}

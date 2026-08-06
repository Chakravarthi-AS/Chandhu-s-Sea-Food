import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecretAsync } from "@/lib/api-auth";
import { orderToRow, rowToOrder } from "@/lib/order-db";
import type { CustomerOrder } from "@/lib/types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-server";
import { normalizePhone } from "@/lib/defaults";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, orders: [] });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ configured: false, orders: [] });
  }

  const tracking = req.nextUrl.searchParams.get("tracking")?.trim();
  const phone = normalizePhone(req.nextUrl.searchParams.get("phone") ?? "");
  const adminSecret = req.headers.get("x-admin-secret");
  const isAdmin = await verifyAdminSecretAsync(adminSecret);

  try {
    if (tracking) {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .ilike("tracking_code", tracking)
        .maybeSingle();
      if (error) throw new Error(error.message);
      const orders = data
        ? [rowToOrder(data as ReturnType<typeof orderToRow>)]
        : [];
      return NextResponse.json({ configured: true, orders });
    }

    if (isAdmin) {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return NextResponse.json({
        configured: true,
        orders: (data ?? []).map((row) =>
          rowToOrder(row as ReturnType<typeof orderToRow>)
        ),
      });
    }

    if (phone.length === 10) {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_phone", phone)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return NextResponse.json({
        configured: true,
        orders: (data ?? []).map((row) =>
          rowToOrder(row as ReturnType<typeof orderToRow>)
        ),
      });
    }

    return NextResponse.json(
      { error: "Provide phone, tracking, or admin credentials" },
      { status: 400 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load orders";
    return NextResponse.json({ configured: true, error: message, orders: [] }, {
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

  let order: CustomerOrder;
  try {
    order = (await req.json()) as CustomerOrder;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const row = orderToRow({
    ...order,
    customerPhone: normalizePhone(order.customerPhone),
  });

  const { error } = await supabase.from("orders").upsert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, order: rowToOrder(row) });
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Add Supabase env vars." },
      { status: 503 }
    );
  }

  const secret = req.headers.get("x-admin-secret");
  if (!(await verifyAdminSecretAsync(secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    id?: string;
    status?: CustomerOrder["status"];
    agentNote?: string;
    deliveryPartnerId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id || !body.status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { data: existing, error: loadError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", body.id)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = rowToOrder(existing as ReturnType<typeof orderToRow>);
  const updated: CustomerOrder = {
    ...order,
    status: body.status,
    ...(body.agentNote !== undefined ? { agentNote: body.agentNote } : {}),
    ...(body.deliveryPartnerId !== undefined
      ? { deliveryPartnerId: body.deliveryPartnerId }
      : {}),
  };

  const row = orderToRow(updated);
  const { error } = await supabase.from("orders").upsert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, order: rowToOrder(row) });
}

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecretAsync } from "@/lib/api-auth";
import { rowToAdminPublic, type AdminUserRow } from "@/lib/admin-db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ADMIN_ROW_ID = "default";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ configured: false });
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("username, display_name")
    .eq("id", ADMIN_ROW_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ configured: true, username: null, displayName: null });
  }

  return NextResponse.json({
    configured: true,
    username: data.username,
    displayName: data.display_name,
  });
}

export async function PUT(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!(await verifyAdminSecretAsync(secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Add Supabase env vars." },
      { status: 503 }
    );
  }

  let body: { username?: string; password?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = body.username?.trim();
  const password = body.password;
  if (!username || !password) {
    return NextResponse.json(
      { error: "username and password are required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const row: AdminUserRow = {
    id: ADMIN_ROW_ID,
    username,
    password,
    display_name: body.displayName?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("admin_users").upsert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...rowToAdminPublic(row) });
}

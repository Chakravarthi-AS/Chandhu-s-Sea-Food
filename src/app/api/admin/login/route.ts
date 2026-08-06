import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_STATE } from "@/lib/defaults";
import { rowToAdminPublic, type AdminUserRow } from "@/lib/admin-db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ADMIN_ROW_ID = "default";

async function ensureAdminRow(): Promise<AdminUserRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", ADMIN_ROW_ID)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return data as AdminUserRow;

  const seed: AdminUserRow = {
    id: ADMIN_ROW_ID,
    username: DEFAULT_STATE.config.adminUsername,
    password: DEFAULT_STATE.config.adminPassword,
    display_name: "Shop Admin",
    updated_at: new Date().toISOString(),
  };
  const { error: insertError } = await supabase.from("admin_users").insert(seed);
  if (insertError) throw new Error(insertError.message);
  return seed;
}

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const ok =
      username === DEFAULT_STATE.config.adminUsername &&
      password === DEFAULT_STATE.config.adminPassword;
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      configured: false,
      username: DEFAULT_STATE.config.adminUsername,
      displayName: null,
    });
  }

  try {
    const row = await ensureAdminRow();
    if (!row) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const ok = username === row.username && password === row.password;
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      configured: true,
      ...rowToAdminPublic(row),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { DEFAULT_STATE } from "./defaults";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase-server";

export function verifyAdminSecret(secret: string | null): boolean {
  if (!secret) return false;
  const fromEnv =
    process.env.ADMIN_API_SECRET ??
    process.env.ADMIN_PASSWORD ??
    DEFAULT_STATE.config.adminPassword;
  return secret === fromEnv;
}

export async function verifyAdminSecretAsync(
  secret: string | null
): Promise<boolean> {
  if (verifyAdminSecret(secret)) return true;
  if (!secret || !isSupabaseConfigured()) return false;

  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data } = await supabase
    .from("admin_users")
    .select("password")
    .eq("id", "default")
    .maybeSingle();

  return data?.password === secret;
}

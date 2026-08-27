// Server-only. API keys for programmatic/agent access to SiteFlow's
// paid tools (see src/app/api/v1/**). Separate from the Supabase Auth
// session used by the dashboard — an external agent has no browser
// cookie, so it authenticates with a bearer key instead.
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

const KEY_PREFIX = "sk_live_";

function hashKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

// Generates a new raw key, stores only its hash, and returns the raw key —
// this is the ONLY moment the raw key is ever available. Callers must show
// it to the user immediately and never persist it themselves.
export async function createApiKey(userId: string, name = "Default key") {
  const raw = KEY_PREFIX + crypto.randomBytes(24).toString("hex");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("api_keys")
    .insert({
      user_id: userId,
      key_hash: hashKey(raw),
      key_prefix: raw.slice(0, 12),
      name,
    })
    .select("id, key_prefix, created_at")
    .single();

  if (error) throw error;

  return { ...data, rawKey: raw };
}

// Looks up which user a raw key belongs to, and updates last_used_at.
// Returns null for a missing, malformed, or revoked key.
export async function verifyApiKey(rawKey: string): Promise<{ userId: string; keyId: string } | null> {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) return null;

  const admin = createAdminClient();
  const { data: key } = await admin
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", hashKey(rawKey))
    .maybeSingle();

  if (!key || key.revoked_at) return null;

  // Best-effort — don't block the request if this write fails.
  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id)
    .then(() => {});

  return { userId: key.user_id as string, keyId: key.id as string };
}

export async function revokeApiKey(userId: string, keyId: string) {
  const admin = createAdminClient();
  // Scoped to user_id too, even though this is the admin client, so one
  // user can never revoke another user's key by guessing an id.
  const { error } = await admin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", userId);
  if (error) throw error;
}

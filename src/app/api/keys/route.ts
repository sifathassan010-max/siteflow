import { createClient } from "@/lib/supabase/server";
import { createApiKey, revokeApiKey } from "@/lib/api-keys";
import { getMonthlyApiUsageSummary } from "@/lib/api-usage";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Soft cap — no real reason for one account to need more than a few keys.
const MAX_KEYS_PER_USER = 5;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: keys, error } = await admin
    .from("api_keys")
    .select("id, key_prefix, name, scopes, last_used_at, revoked_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const usage = await getMonthlyApiUsageSummary(user.id);

  return NextResponse.json({ keys, usage });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("api_keys")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if ((count ?? 0) >= MAX_KEYS_PER_USER) {
    return NextResponse.json(
      { error: `You've hit the limit of ${MAX_KEYS_PER_USER} active API keys per account. Revoke one first.` },
      { status: 400 }
    );
  }

  const { name, scopes } = await request.json().catch(() => ({ name: undefined, scopes: undefined }));

  const key = await createApiKey(
    user.id,
    typeof name === "string" && name.trim() ? name.trim() : undefined,
    scopes
  );

  // rawKey is only ever returned here, once. The dashboard UI must show
  // it to the user immediately and warn them it won't be shown again.
  return NextResponse.json({ key });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");
  if (!keyId) {
    return NextResponse.json({ error: "Missing required query param: id" }, { status: 400 });
  }

  await revokeApiKey(user.id, keyId);
  return NextResponse.json({ ok: true });
}

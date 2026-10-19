import { createClient } from "@/lib/supabase/server";
import { validateProfileInput } from "@/lib/profile-validation";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, username, company_name, website_url, country")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = validateProfileInput(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.errors.join(". ") }, { status: 400 });
  }

  // Extra defense against a race condition: two tabs both check "is this
  // username free?" and both pass, then both try to save it. The DB-level
  // unique constraint on profiles.username is the real guarantee — this
  // just turns that low-level Postgres error into a friendly message
  // instead of a raw 500.
  const { data: profile, error } = await supabase
    .from("profiles")
    .update(result.data)
    .eq("id", user.id)
    .select("full_name, username, company_name, website_url, country")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

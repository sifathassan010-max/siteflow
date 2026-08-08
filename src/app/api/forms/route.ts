import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { DEFAULT_FIELDS, sanitizeFields } from "@/lib/form-types";

// Soft cap so one account can't spin up unlimited forms during testing.
const MAX_FORMS_PER_USER = 10;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data: forms, error } = await supabase
    .from("forms")
    .select("id, name, fields, notify_email, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ forms });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { name, fields, notify_email: notifyEmail } = await request.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Form name is required" }, { status: 400 });
  }

  const { count } = await supabase
    .from("forms")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= MAX_FORMS_PER_USER) {
    return NextResponse.json(
      { error: `You've hit the limit of ${MAX_FORMS_PER_USER} forms per account.` },
      { status: 400 }
    );
  }

  const cleanFields = fields ? sanitizeFields(fields) : DEFAULT_FIELDS;

  const { data: form, error } = await supabase
    .from("forms")
    .insert({
      user_id: user.id,
      name: name.trim(),
      fields: cleanFields,
      notify_email:
        notifyEmail && typeof notifyEmail === "string" && notifyEmail.trim()
          ? notifyEmail.trim()
          : null,
    })
    .select("id, name, fields, notify_email, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ form });
}

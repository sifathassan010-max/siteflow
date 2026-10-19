import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

// Admin-only: approve or reject a testimonial that's on the public
// pipeline. Deliberately refuses to touch a 'private' row — private
// feedback can NEVER become public through this endpoint, no matter what
// status is requested. This is the hard enforcement of "never
// automatically publish user feedback", not just a UI-level guardrail.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const nextStatus = (body as { status?: unknown })?.status;
  if (nextStatus !== "approved" && nextStatus !== "rejected") {
    return NextResponse.json(
      { error: "status must be \"approved\" or \"rejected\"" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("testimonials")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });
  }
  if (existing.status === "private") {
    return NextResponse.json(
      { error: "This is private feedback and was never on the public track — it can't be approved or rejected." },
      { status: 409 }
    );
  }

  const { data: testimonial, error } = await admin
    .from("testimonials")
    .update({
      status: nextStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ testimonial });
}

// Admin-only: permanently delete a testimonial (private, pending,
// approved, or rejected — e.g. removing spam or a withdrawn testimonial).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("testimonials").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

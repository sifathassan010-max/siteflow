import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

// Admin-only: lists ALL testimonials (private, pending, approved,
// rejected) for the review dashboard. Uses the service-role client
// deliberately — the RLS policies on `testimonials` only let a user read
// their OWN row, by design, so a normal session client could never see
// other people's submissions even if this check were somehow bypassed.
// The is_admin check below is what actually gates this data.
export async function GET(request: Request) {
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

  const status = new URL(request.url).searchParams.get("status");
  const admin = createAdminClient();

  let query = admin
    .from("testimonials")
    .select(
      "id, user_id, rating, liked, improve, additional_comments, allow_publish, consent_given, display_name, company_name, website_url, role, photo_url, status, created_at, reviewed_at"
    )
    .order("created_at", { ascending: false });

  if (status && ["private", "pending", "approved", "rejected"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data: testimonials, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ testimonials: testimonials ?? [] });
}

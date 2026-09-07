// Server-only. SiteFlow had no admin/staff concept before the testimonial
// approval feature — this is the one place that decides "is this user
// allowed to approve/reject/delete testimonials". Backed by
// profiles.is_admin (see supabase/schema-testimonials.sql), which
// defaults to false for every account, existing or new.
import { createAdminClient } from "@/lib/supabase/admin";

export async function isAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  return data?.is_admin === true;
}

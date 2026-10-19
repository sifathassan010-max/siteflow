import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Called automatically by Vercel Cron (see vercel.json) so the Supabase
// free-tier project never goes 7 days without a real database query and
// gets auto-paused.
export async function GET() {
  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").select("id").limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pinged: new Date().toISOString() });
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  // Ownership check happens via the RLS policy on form_submissions (it joins
  // back to forms.user_id), but we confirm the form itself exists/belongs to
  // this user first so we can return a clean 404 instead of an empty list.
  const { data: form } = await supabase
    .from("forms")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const { data: submissions, error } = await supabase
    .from("form_submissions")
    .select("id, data, created_at")
    .eq("form_id", id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submissions });
}

import { createClient } from "@/lib/supabase/server";
import { validateTestimonialSubmission } from "@/lib/testimonials";
import { NextResponse } from "next/server";

// Submits feedback from the dashboard "Give Feedback" form. Whether this
// ends up private (status='private') or on the public review pipeline
// (status='pending', awaiting admin approval) is decided entirely by
// validateTestimonialSubmission() server-side — never by a client-supplied
// status field.
export async function POST(request: Request) {
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

  const result = validateTestimonialSubmission(body, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.errors.join(" ") }, { status: 400 });
  }

  // RLS ("insert own testimonial") also enforces auth.uid() = user_id —
  // this is the session client, not the service role, so a spoofed
  // user_id in the body would be rejected by Postgres regardless.
  const { data: testimonial, error } = await supabase
    .from("testimonials")
    .insert(result.data)
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ testimonial });
}

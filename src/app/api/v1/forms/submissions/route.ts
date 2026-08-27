import { authenticateApiRequest } from "@/lib/api-auth";
import { checkApiUsageLimit, logApiUsage } from "@/lib/api-usage";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const MAX_LIMIT = 100;

// GET /api/v1/forms/submissions?formId=...&limit=20
// Auth: Authorization: Bearer sk_live_...
// Returns submissions for ONE of the caller's own forms (created in the
// dashboard forms builder) — e.g. for an agent that wants to check for
// new leads and summarize or triage them. This does not create/edit
// forms — that still happens in the dashboard.
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const usage = await checkApiUsageLimit(auth.userId, "forms");
  if (!usage.allowed) {
    const message =
      usage.reason === "no_plan"
        ? "This API key's account doesn't have an active Forms API plan. Subscribe at siteflow-omega.vercel.app/pricing."
        : `Monthly quota exceeded (${usage.used}/${usage.limit} calls this month). Resets at the start of next month.`;
    return NextResponse.json({ error: message }, { status: 402 });
  }

  const { searchParams } = new URL(request.url);
  const formId = searchParams.get("formId");
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), MAX_LIMIT) : 20;

  if (!formId) {
    return NextResponse.json({ error: "Missing required query param: formId" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Ownership check — an API key can only read submissions for forms
  // belonging to the same account it authenticates as.
  const { data: form } = await admin
    .from("forms")
    .select("id, name")
    .eq("id", formId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!form) {
    return NextResponse.json({ error: "No form with that id on this account." }, { status: 404 });
  }

  const { data: submissions, error } = await admin
    .from("form_submissions")
    .select("id, data, created_at")
    .eq("form_id", formId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logApiUsage(auth.userId, "forms", "forms_submissions");

  return NextResponse.json({
    form: { id: form.id, name: form.name },
    count: submissions?.length ?? 0,
    submissions,
  });
}

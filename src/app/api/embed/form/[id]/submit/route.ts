import { createAdminClient } from "@/lib/supabase/admin";
import { checkUsageLimit, logUsage } from "@/lib/usage";
import { sanitizeFields } from "@/lib/form-types";
import { NextResponse } from "next/server";

const MAX_FIELD_VALUE_CHARS = 2000;

// PUBLIC route — no auth.getUser() check on purpose. This is what an
// anonymous visitor on a SiteFlow customer's own website submits when they
// fill out the embedded form. Usage is metered against the FORM OWNER's
// account (form.user_id), same trial/paid limits as the dashboard — mirrors
// how /api/embed/[id]/chat handles the chatbot tool.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: form } = await admin
    .from("forms")
    .select("id, user_id, fields, notify_email")
    .eq("id", id)
    .maybeSingle();

  if (!form) {
    return NextResponse.json({ error: "This form no longer exists." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const fields = sanitizeFields(form.fields);
  const submitted = body as Record<string, unknown>;
  const cleanData: Record<string, string | boolean> = {};

  for (const field of fields) {
    const raw = submitted[field.id];

    if (field.type === "checkbox") {
      cleanData[field.id] = Boolean(raw);
      continue;
    }

    const value = typeof raw === "string" ? raw.trim() : "";

    if (field.required && !value) {
      return NextResponse.json(
        { error: `"${field.label || field.id}" is required` },
        { status: 400 }
      );
    }
    if (value.length > MAX_FIELD_VALUE_CHARS) {
      return NextResponse.json(
        { error: `"${field.label || field.id}" is too long` },
        { status: 400 }
      );
    }
    cleanData[field.id] = value;
  }

  const usage = await checkUsageLimit(form.user_id, "forms");
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "This form has reached its submission limit. Contact the site owner." },
      { status: 402 }
    );
  }

  const { error } = await admin.from("form_submissions").insert({
    form_id: form.id,
    data: cleanData,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logUsage(form.user_id, "forms", "submission");

  // Email notification (via notify_email) is a nice-to-have hook, left as a
  // no-op for now — needs a transactional email provider (Resend, etc.) that
  // isn't wired up yet. The submission is safely stored either way.

  return NextResponse.json({ ok: true });
}

import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeFields } from "@/lib/form-types";
import EmbedFormWidget from "./embed-form-widget";

// PUBLIC page — not under /dashboard or /tools, so middleware doesn't
// require login here. This is what a customer puts in an <iframe> on their
// own website for their own visitors to fill out.
export default async function EmbedFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: form } = await admin
    .from("forms")
    .select("id, name, fields")
    .eq("id", id)
    .maybeSingle();

  if (!form) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas p-6 text-center text-sm text-slate">
        This form no longer exists.
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <EmbedFormWidget formId={form.id} formName={form.name} fields={sanitizeFields(form.fields)} />
    </div>
  );
}

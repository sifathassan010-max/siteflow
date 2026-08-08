import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import EditFormFields from "./edit-form-fields";
import EmbedCodeBox from "./embed-code-box";
import SubmissionsTable from "./submissions-table";
import { sanitizeFields } from "@/lib/form-types";

export default async function FormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: form } = await supabase
    .from("forms")
    .select("id, name, fields, notify_email, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!form) notFound();

  const fields = sanitizeFields(form.fields);

  return (
    <DashboardShell email={user.email ?? ""}>
      <h1 className="text-2xl font-bold">{form.name}</h1>
      <p className="mt-2 max-w-lg text-slate">
        Edit fields, grab the embed code for your site, and review submissions
        below.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-sm font-semibold text-slate">Submissions</h2>
            <div className="mt-3">
              <SubmissionsTable formId={form.id} fields={fields} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-sm font-semibold text-slate">Embed</h2>
            <div className="mt-3">
              <EmbedCodeBox formId={form.id} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate">Edit form</h2>
            <div className="mt-3">
              <EditFormFields
                formId={form.id}
                initialName={form.name}
                initialFields={fields}
                initialNotifyEmail={form.notify_email ?? ""}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

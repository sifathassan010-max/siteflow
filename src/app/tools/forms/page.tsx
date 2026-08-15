import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import DashboardShell from "@/components/dashboard-shell";
import PublicToolShell from "@/components/public-tool-shell";
import UsageBanner from "@/components/usage-banner";
import NewFormForm from "./new-form-form";

const INTRO = (
  <>
    <h1 className="text-2xl font-bold">Forms &amp; lead capture</h1>
    <p className="mt-2 max-w-lg text-slate">
      Build a form with whatever fields you need, then embed it on your own
      site. Every submission lands here in your dashboard.
    </p>
  </>
);

export default async function FormsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <PublicToolShell>
        {INTRO}
        <p className="mt-4 rounded-xl border border-dashed border-line bg-white p-4 text-sm text-slate">
          You&apos;re viewing this without an account. Build a form below to
          try it — you&apos;ll be asked to log in when you create your first
          one.
        </p>
        <div className="mt-6 max-w-md">
          <NewFormForm />
        </div>
      </PublicToolShell>
    );
  }

  const { data: forms } = await supabase
    .from("forms")
    .select("id, name, fields, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardShell email={user.email ?? ""}>
      {INTRO}

      <UsageBanner userId={user.id} tool="forms" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="text-sm font-semibold text-slate">Your forms</h2>

          {!forms || forms.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-line p-6 text-sm text-slate">
              No forms yet — create your first one to the right.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {forms.map((form) => (
                <li key={form.id}>
                  <Link
                    href={`/tools/forms/${form.id}`}
                    className="block rounded-xl border border-line bg-white p-4 transition hover:border-ink/30"
                  >
                    <p className="font-semibold">{form.name}</p>
                    <p className="mt-1 text-sm text-slate">
                      {Array.isArray(form.fields) ? form.fields.length : 0} fields
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate">Create a new form</h2>
          <div className="mt-3">
            <NewFormForm />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

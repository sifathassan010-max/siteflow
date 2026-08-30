import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import DashboardShell from "@/components/dashboard-shell";
import PublicToolShell from "@/components/public-tool-shell";
import UsageBanner from "@/components/usage-banner";
import NewFormForm from "./new-form-form";

export const metadata: Metadata = {
  title: "Lead Capture Forms & Widgets for Small Business Websites | SiteFlow",
  description:
    "Build a form with the fields you need, then embed it on your own site to turn visitors into leads. Drag-and-drop form builder made for small business websites.",
  alternates: { canonical: "/tools/forms" },
  openGraph: {
    title: "Lead Capture Forms & Widgets for Small Business Websites | SiteFlow",
    description: "Drag-and-drop forms plus on-site capture widgets that turn visitors into leads.",
    url: "/tools/forms",
  },
};

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

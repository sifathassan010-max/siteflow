import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import FeedbackForm from "./feedback-form";

export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell email={user.email ?? ""}>
      <h1 className="text-2xl font-bold">Give feedback</h1>
      <p className="mt-2 max-w-lg text-slate">
        Tell us how SiteFlow is working for you. It takes about a minute,
        and you decide whether we can share it publicly.
      </p>

      <div className="mt-6 max-w-lg">
        <FeedbackForm />
      </div>
    </DashboardShell>
  );
}

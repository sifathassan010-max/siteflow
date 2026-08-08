import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell email={user.email ?? ""}>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="mt-2 max-w-md text-slate">
        Coming soon \u2014 real functionality gets built here in a later step.
        You&apos;re seeing this because you&apos;re logged in and the
        paywall/trial check passed.
      </p>
    </DashboardShell>
  );
}

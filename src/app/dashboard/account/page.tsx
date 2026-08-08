import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell email={user.email ?? ""}>
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="mt-2 text-slate">Coming soon.</p>
    </DashboardShell>
  );
}

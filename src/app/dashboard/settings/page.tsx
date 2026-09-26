import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import SettingsForm from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell email={user.email ?? ""}>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-2 max-w-lg text-slate">
        Update your login email or password. For security, you&apos;ll need
        to confirm your current password to save either change.
      </p>

      <div className="mt-6 max-w-lg">
        <SettingsForm currentEmail={user.email ?? ""} />
      </div>
    </DashboardShell>
  );
}

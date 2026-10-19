import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, company_name, website_url, country")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <DashboardShell email={user.email ?? ""}>
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="mt-2 max-w-lg text-slate">
        None of these are required — fill in whatever you&apos;d like others
        (or your own records) to show.
      </p>

      <div className="mt-6 max-w-lg">
        <ProfileForm
          initialFullName={profile?.full_name ?? ""}
          initialUsername={profile?.username ?? ""}
          initialCompanyName={profile?.company_name ?? ""}
          initialWebsiteUrl={profile?.website_url ?? ""}
          initialCountry={profile?.country ?? ""}
        />
      </div>
    </DashboardShell>
  );
}

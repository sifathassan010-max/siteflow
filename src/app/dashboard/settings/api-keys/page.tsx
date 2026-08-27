import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import ApiKeysClient from "./api-keys-client";

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell email={user.email ?? ""}>
      <h1 className="text-2xl font-bold">API keys</h1>
      <p className="mt-2 max-w-xl text-slate">
        Use an API key to call SiteFlow&apos;s tools programmatically — for a
        script, backend, or AI agent — instead of through the dashboard.
        Each key inherits whichever API plans are active on this account.
        See the{" "}
        <a href="/api-docs" className="text-brand underline">
          API docs
        </a>{" "}
        for endpoints and request/response formats.
      </p>

      <div className="mt-6 max-w-2xl">
        <ApiKeysClient />
      </div>
    </DashboardShell>
  );
}

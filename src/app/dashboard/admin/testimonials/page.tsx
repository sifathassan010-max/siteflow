import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import { isAdmin } from "@/lib/admin";
import AdminTestimonialsClient from "./admin-testimonials-client";

// Deliberately not linked from anywhere in the shared nav/sidebar (see
// src/lib/site-config.ts) — only an account with profiles.is_admin = true
// can do anything useful here even if they find the URL, and every admin
// API route re-checks is_admin itself regardless of this page-level gate.
export default async function AdminTestimonialsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await isAdmin(user.id))) redirect("/dashboard");

  return (
    <DashboardShell email={user.email ?? ""}>
      <h1 className="text-2xl font-bold">Review testimonials</h1>
      <p className="mt-2 max-w-lg text-slate">
        Approve or reject feedback that customers agreed to have featured.
        Private feedback is never shown here as publishable — it&apos;s listed
        for visibility only and can&apos;t be approved.
      </p>

      <div className="mt-6">
        <AdminTestimonialsClient />
      </div>
    </DashboardShell>
  );
}

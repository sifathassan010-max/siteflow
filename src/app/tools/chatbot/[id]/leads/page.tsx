import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/dashboard-shell";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function BotLeadsPage({
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

  const { data: bot } = await supabase
    .from("bots")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!bot) notFound();

  const { data: leads } = await supabase
    .from("bot_leads")
    .select("id, name, email, message, created_at")
    .eq("bot_id", id)
    .order("created_at", { ascending: false });

  return (
    <DashboardShell email={user.email ?? ""}>
      <Link href={`/tools/chatbot/${bot.id}`} className="text-sm text-slate hover:text-ink">
        ← Back to {bot.name}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Leads</h1>
      <p className="mt-2 max-w-lg text-slate">
        Visitors who left their contact info through {bot.name}&apos;s widget.
      </p>

      <div className="mt-8">
        {!leads || leads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-6 text-sm text-slate">
            No leads yet — they&apos;ll show up here once a visitor uses the
            &quot;Leave your info&quot; option in the widget.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs font-semibold text-slate">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Received</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">{lead.name || "—"}</td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${lead.email}`} className="text-brand hover:underline">
                        {lead.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate">{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

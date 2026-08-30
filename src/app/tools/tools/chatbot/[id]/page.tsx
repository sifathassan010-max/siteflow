import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/dashboard-shell";
import BotTestChat from "./bot-test-chat";
import EmbedCodeBox from "./embed-code-box";

export default async function BotDetailPage({
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
    .select("id, name, persona, website_url, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!bot) notFound();

  return (
    <DashboardShell email={user.email ?? ""}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{bot.name}</h1>
          <p className="mt-2 max-w-lg text-slate">
            {bot.website_url
              ? `Trained on content from ${bot.website_url}.`
              : "No website attached — this bot answers from its persona only."}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/tools/chatbot/${bot.id}/settings`}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas"
          >
            Settings
          </Link>
          <Link
            href={`/tools/chatbot/${bot.id}/leads`}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas"
          >
            Leads
          </Link>
          <Link
            href={`/tools/chatbot/${bot.id}/conversations`}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas"
          >
            Conversations
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-slate">Test this bot</h2>
          <div className="mt-3">
            <BotTestChat botId={bot.id} botName={bot.name} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate">Embed on your site</h2>
          <div className="mt-3">
            <EmbedCodeBox botId={bot.id} />
          </div>

          <h2 className="mt-6 text-sm font-semibold text-slate">Persona</h2>
          <p className="mt-2 rounded-xl border border-line bg-white p-4 text-sm text-slate">
            {bot.persona}
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}

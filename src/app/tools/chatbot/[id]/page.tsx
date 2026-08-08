import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
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
      <h1 className="text-2xl font-bold">{bot.name}</h1>
      <p className="mt-2 max-w-lg text-slate">
        {bot.website_url
          ? `Trained on content from ${bot.website_url}.`
          : "No website attached — this bot answers from its persona only."}
      </p>

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

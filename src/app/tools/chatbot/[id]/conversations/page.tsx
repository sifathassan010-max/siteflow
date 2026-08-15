import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/dashboard-shell";
import ConversationHistory from "./conversation-history";

export default async function BotConversationsPage({
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

  return (
    <DashboardShell email={user.email ?? ""}>
      <Link href={`/tools/chatbot/${bot.id}`} className="text-sm text-slate hover:text-ink">
        ← Back to {bot.name}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Conversations</h1>
      <p className="mt-2 max-w-lg text-slate">
        Everything visitors have asked {bot.name} through the embedded widget.
      </p>

      <div className="mt-8">
        <ConversationHistory botId={bot.id} />
      </div>
    </DashboardShell>
  );
}

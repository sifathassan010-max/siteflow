import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/dashboard-shell";
import BotSettingsForm from "./bot-settings-form";
import { isPaidForTool } from "@/lib/usage";

export default async function BotSettingsPage({
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

  const [{ data: bot }, isPaid] = await Promise.all([
    supabase
      .from("bots")
      .select(
        "id, name, persona, website_url, quick_prompts, widget_color, logo_url, escalation_contact, model, custom_queries, avatar_config, widget_position, trained_pages, last_trained_at"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    isPaidForTool(user.id, "chatbot"),
  ]);

  if (!bot) notFound();

  return (
    <DashboardShell email={user.email ?? ""}>
      <Link href={`/tools/chatbot/${bot.id}`} className="text-sm text-slate hover:text-ink">
        ← Back to {bot.name}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Bot settings</h1>
      <p className="mt-2 max-w-lg text-slate">
        Persona, quick prompts, widget appearance, escalation, model choice,
        and retraining — all in one place.
      </p>

      <div className="mt-8 max-w-xl">
        <BotSettingsForm bot={bot} isPaid={isPaid} />
      </div>
    </DashboardShell>
  );
}

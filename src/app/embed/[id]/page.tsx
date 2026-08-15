import { createAdminClient } from "@/lib/supabase/admin";
import EmbedChatWidget from "./embed-chat-widget";

// PUBLIC page — not under /dashboard or /tools, so middleware doesn't
// require login here. This is what a customer puts in an <iframe> on
// their own website for their own visitors to talk to.
export default async function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: bot } = await admin
    .from("bots")
    .select("id, name, quick_prompts, widget_color, logo_url, escalation_contact")
    .eq("id", id)
    .maybeSingle();

  if (!bot) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas p-6 text-center text-sm text-slate">
        This chatbot no longer exists.
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <EmbedChatWidget
        botId={bot.id}
        botName={bot.name}
        quickPrompts={bot.quick_prompts ?? []}
        widgetColor={bot.widget_color ?? "#4f46e5"}
        logoUrl={bot.logo_url}
        escalationContact={bot.escalation_contact}
      />
    </div>
  );
}

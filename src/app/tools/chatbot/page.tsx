import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/dashboard-shell";
import NewBotForm from "./new-bot-form";

export default async function ChatbotBuilderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: bots } = await supabase
    .from("bots")
    .select("id, name, website_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardShell email={user.email ?? ""}>
      <h1 className="text-2xl font-bold">Chatbot builder</h1>
      <p className="mt-2 max-w-lg text-slate">
        Create a bot with a name, a persona/instructions, and — optionally —
        your website URL so it can answer from your own content. Each bot
        gets its own embeddable widget you can drop into any site.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="text-sm font-semibold text-slate">Your bots</h2>

          {!bots || bots.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-line p-6 text-sm text-slate">
              No bots yet — create your first one to the right.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {bots.map((bot) => (
                <li key={bot.id}>
                  <Link
                    href={`/tools/chatbot/${bot.id}`}
                    className="block rounded-xl border border-line bg-white p-4 transition hover:border-ink/30"
                  >
                    <p className="font-semibold">{bot.name}</p>
                    <p className="mt-1 text-sm text-slate">
                      {bot.website_url ? bot.website_url : "No website attached"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate">Create a new bot</h2>
          <div className="mt-3">
            <NewBotForm />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

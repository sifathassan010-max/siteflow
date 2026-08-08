import { createAdminClient } from "@/lib/supabase/admin";
import { checkUsageLimit, logUsage } from "@/lib/usage";
import { NextResponse } from "next/server";

function buildSystemPrompt(persona: string, siteContent: string | null) {
  if (!siteContent) return persona;
  return `${persona}

You have the following information about the business's website. Use it to
answer questions accurately. If something isn't covered by this content,
say you're not sure rather than making it up.

--- WEBSITE CONTENT ---
${siteContent}
--- END WEBSITE CONTENT ---`;
}

// PUBLIC route — no auth.getUser() check on purpose. This is what an
// anonymous visitor on a SiteFlow customer's own website talks to.
// Usage is still metered, but against the BOT OWNER's account (bot.user_id),
// not the anonymous visitor — same trial/paid limits as the dashboard.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: bot } = await admin
    .from("bots")
    .select("id, user_id, persona, site_content")
    .eq("id", id)
    .maybeSingle();

  if (!bot) {
    return NextResponse.json({ error: "This chatbot no longer exists." }, { status: 404 });
  }

  const { message } = await request.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const usage = await checkUsageLimit(bot.user_id, "chatbot");
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "This chatbot has reached its message limit. Contact the site owner." },
      { status: 402 }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Chatbot isn't configured yet" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: buildSystemPrompt(bot.persona, bot.site_content) },
          { role: "user", content: message },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Groq API error:", res.status, errText);
      return NextResponse.json(
        { error: "The chatbot is having trouble right now. Try again in a moment." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't come up with a reply.";

    await logUsage(bot.user_id, "chatbot", "embed_message");

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Embed chat error:", err);
    return NextResponse.json(
      { error: "The chatbot is having trouble right now. Try again in a moment." },
      { status: 500 }
    );
  }
}

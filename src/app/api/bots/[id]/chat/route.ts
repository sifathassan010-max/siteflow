import { createClient } from "@/lib/supabase/server";
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data: bot } = await supabase
    .from("bots")
    .select("id, user_id, persona, site_content")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  const { message } = await request.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }
  if (message.length > 1000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const usage = await checkUsageLimit(user.id, "chatbot");
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: `You've used your ${usage.limit} trial messages for the chatbot tool. Upgrade to keep testing.`,
      },
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
        { error: "The bot is having trouble right now. Try again in a moment." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't come up with a reply.";

    await logUsage(user.id, "chatbot", "dashboard_test_message");

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Bot chat error:", err);
    return NextResponse.json(
      { error: "The bot is having trouble right now. Try again in a moment." },
      { status: 500 }
    );
  }
}

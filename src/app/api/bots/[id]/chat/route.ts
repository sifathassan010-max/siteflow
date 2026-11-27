import { createClient } from "@/lib/supabase/server";
import { logUsage } from "@/lib/usage";
import { checkChatAllowance } from "@/lib/chat-limits";
import { extractTokenUsage, ownerCapMessage } from "@/lib/chat-limits-core";
import { resolveGroqModel } from "@/lib/groq-models";
import { loadKnowledge } from "@/lib/chat-context";
import { loadProductSection } from "@/lib/product-context";
import { extractHosts, restrictReplyLinks } from "@/lib/safe-links";
import { buildBotSystemPrompt } from "@/lib/training-core";
import { NextResponse } from "next/server";

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
    .select("id, user_id, persona, site_content, content_mode, core_content, model, escalation_contact, product_count, shop_url")
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

  const allowance = await checkChatAllowance(user.id);
  if (!allowance.allowed) {
    if (allowance.kind === "trial_exhausted") {
      return NextResponse.json(
        {
          error: `You've used your ${allowance.limit} trial messages for the chatbot tool. Upgrade to keep testing.`,
        },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: ownerCapMessage(allowance.reason), code: "owner_cap" },
      { status: 429, headers: { "Retry-After": String(allowance.retryAfterSeconds) } }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Chatbot isn't configured yet" }, { status: 500 });
  }

  try {
    const knowledge = await loadKnowledge(bot, message, null);
    const productSection = await loadProductSection(bot, message, null);
    const systemPrompt = buildBotSystemPrompt(bot.persona, knowledge, bot.escalation_contact, productSection);
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveGroqModel(bot.model),
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
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
    let reply: string = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't come up with a reply.";
    if (productSection) reply = restrictReplyLinks(reply, extractHosts(systemPrompt));

    const tokens = extractTokenUsage(data, resolveGroqModel(bot.model));
    await logUsage(user.id, "chatbot", "dashboard_test_message", 1, tokens);

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Bot chat error:", err);
    return NextResponse.json(
      { error: "The bot is having trouble right now. Try again in a moment." },
      { status: 500 }
    );
  }
}

import { createAdminClient } from "@/lib/supabase/admin";
import { checkUsageLimit, logUsage } from "@/lib/usage";
import { NextResponse } from "next/server";

// How many past turns (user+assistant pairs) to feed back to the model as
// context. Bounded so token cost doesn't grow unbounded on long chats.
const HISTORY_TURNS = 6;

function buildSystemPrompt(
  persona: string,
  siteContent: string | null,
  escalationContact: string | null
) {
  let prompt = persona;

  if (siteContent) {
    prompt += `

You have the following information about the business's website. Use it to
answer questions accurately. If something isn't covered by this content,
say you're not sure rather than making it up.

--- WEBSITE CONTENT ---
${siteContent}
--- END WEBSITE CONTENT ---`;
  }

  if (escalationContact) {
    prompt += `

If you don't know the answer, or the visitor asks to speak to a real
person, tell them they can reach the business directly at
${escalationContact} instead of guessing.`;
  }

  return prompt;
}

// Finds the conversation row for this (bot, visitor session), creating one
// if this is the visitor's first message. Uses the admin client since
// anonymous visitors have no Supabase auth session to satisfy RLS with.
async function getOrCreateConversation(
  admin: ReturnType<typeof createAdminClient>,
  botId: string,
  visitorSession: string
) {
  const { data: existing } = await admin
    .from("bot_conversations")
    .select("id")
    .eq("bot_id", botId)
    .eq("visitor_session", visitorSession)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await admin
    .from("bot_conversations")
    .insert({ bot_id: botId, visitor_session: visitorSession })
    .select("id")
    .single();

  if (error) {
    // Rare race: two tabs of the same session created it at once. Re-fetch.
    const { data: retry } = await admin
      .from("bot_conversations")
      .select("id")
      .eq("bot_id", botId)
      .eq("visitor_session", visitorSession)
      .maybeSingle();
    if (retry) return retry.id as string;
    throw error;
  }

  return created.id as string;
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
    .select("id, user_id, persona, site_content, model, escalation_contact")
    .eq("id", id)
    .maybeSingle();

  if (!bot) {
    return NextResponse.json({ error: "This chatbot no longer exists." }, { status: 404 });
  }

  const { message, sessionId } = await request.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "Missing session" }, { status: 400 });
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

  let conversationId: string;
  try {
    conversationId = await getOrCreateConversation(admin, bot.id, sessionId);
  } catch (err) {
    console.error("Conversation lookup/create error:", err);
    // Don't block the chat over a history-tracking failure — degrade
    // gracefully to a stateless reply instead of erroring the visitor out.
    conversationId = "";
  }

  // Pull recent turns for this conversation so the bot has multi-turn
  // context instead of answering each message in isolation.
  let historyMessages: { role: "user" | "assistant"; content: string }[] = [];
  if (conversationId) {
    const { data: pastMessages } = await admin
      .from("bot_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_TURNS * 2);

    if (pastMessages) {
      historyMessages = pastMessages.reverse() as typeof historyMessages;
    }
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: bot.model || "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(bot.persona, bot.site_content, bot.escalation_contact),
          },
          ...historyMessages,
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

    if (conversationId) {
      const now = new Date().toISOString();
      await admin.from("bot_messages").insert([
        { conversation_id: conversationId, role: "user", content: message },
        { conversation_id: conversationId, role: "assistant", content: reply },
      ]);
      await admin
        .from("bot_conversations")
        .update({ last_message_at: now })
        .eq("id", conversationId);
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Embed chat error:", err);
    return NextResponse.json(
      { error: "The chatbot is having trouble right now. Try again in a moment." },
      { status: 500 }
    );
  }
}

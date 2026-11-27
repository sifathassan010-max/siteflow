import { createAdminClient } from "@/lib/supabase/admin";
import { logUsage } from "@/lib/usage";
import { checkChatAllowance, checkVisitorRate } from "@/lib/chat-limits";
import {
  VISITOR_CAP_MESSAGE,
  extractTokenUsage,
  normalizeSessionId,
  visitorRateMessage,
} from "@/lib/chat-limits-core";
import { resolveGroqModel } from "@/lib/groq-models";
import { loadKnowledge } from "@/lib/chat-context";
import { loadProductSection } from "@/lib/product-context";
import { extractHosts, restrictReplyLinks } from "@/lib/safe-links";
import { buildBotSystemPrompt } from "@/lib/training-core";
import { NextResponse } from "next/server";

// How many past turns (user+assistant pairs) to feed back to the model as
// context. Bounded so token cost doesn't grow unbounded on long chats.
const HISTORY_TURNS = 6;

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
    .select("id, user_id, persona, site_content, content_mode, core_content, model, escalation_contact, product_count, shop_url")
    .eq("id", id)
    .maybeSingle();

  if (!bot) {
    return NextResponse.json({ error: "This chatbot no longer exists." }, { status: 404 });
  }

  let body: { message?: unknown; sessionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const message = body.message;
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }
  const sessionId = normalizeSessionId(body.sessionId);
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session" }, { status: 400 });
  }

  // Per-visitor abuse limits (per session and per IP) — checked first so a
  // flooding visitor can't even reach the owner-cap queries or Groq.
  const rate = await checkVisitorRate(bot.id, sessionId, request);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: visitorRateMessage(rate.reason), code: "visitor_rate_limited" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  // Owner's plan limits: trial lifetime cap, or paid monthly/daily caps.
  const allowance = await checkChatAllowance(bot.user_id);
  if (!allowance.allowed) {
    if (allowance.kind === "trial_exhausted") {
      return NextResponse.json(
        { error: "This chatbot has reached its message limit. Contact the site owner.", code: "owner_limit" },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: VISITOR_CAP_MESSAGE, code: "owner_cap" },
      { status: 429, headers: { "Retry-After": String(allowance.retryAfterSeconds) } }
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

  // Chunked bots: pull only the best-matching excerpts for this message
  // (+ the previous visitor message so follow-ups like "how much?" still work).
  const previousUser =
    [...historyMessages].reverse().find((m) => m.role === "user")?.content ?? null;

  try {
    const knowledge = await loadKnowledge(bot, message, previousUser);
    // Shopify catalog: only the products matching this message (null = bot has none).
    const productSection = await loadProductSection(bot, message, previousUser);
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
    let reply: string = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't come up with a reply.";
    // Bots with a product catalog may only link to sites they were given
    // (prompt-injection guard: a poisoned product text can't make the bot
    // send visitors to some other site).
    if (productSection) reply = restrictReplyLinks(reply, extractHosts(systemPrompt));

    const tokens = extractTokenUsage(data, resolveGroqModel(bot.model));
    await logUsage(bot.user_id, "chatbot", "embed_message", 1, tokens);

    if (conversationId) {
      const nowMs = Date.now();
      const now = new Date(nowMs).toISOString();
      // Explicit, different timestamps: a single INSERT gives both rows the
      // same now(), which made the user/assistant order of a pair random when
      // history is read back ordered by created_at.
      await admin.from("bot_messages").insert([
        { conversation_id: conversationId, role: "user", content: message, created_at: now },
        {
          conversation_id: conversationId,
          role: "assistant",
          content: reply,
          created_at: new Date(nowMs + 1).toISOString(),
        },
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

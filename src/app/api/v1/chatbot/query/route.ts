import { authenticateApiRequest } from "@/lib/api-auth";
import { checkApiUsageLimit, logApiUsage } from "@/lib/api-usage";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// POST /api/v1/chatbot/query
// Body: { "botId": "...", "message": "..." }
// Auth: Authorization: Bearer sk_live_...
// Lets an API-key holder send a one-off message to one of THEIR OWN
// trained bots (created in the dashboard chatbot builder) and get a reply
// back as structured JSON — e.g. for an agent that wants to ask "what are
// this business's hours?" without embedding the chat widget on a page.
// This does not create/manage bots — that still happens in the dashboard.
export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const usage = await checkApiUsageLimit(auth.userId, "chatbot", auth.scopes);
  if (!usage.allowed) {
    const message =
      usage.reason === "no_plan"
        ? "This API key's account doesn't have an active Chatbot API plan. Subscribe at siteflow-omega.vercel.app/pricing."
        : usage.reason === "key_not_scoped"
        ? "This API key isn't scoped for the Chatbot API. Create a new key with that scope, or use an unscoped key."
        : `Monthly quota exceeded (${usage.used}/${usage.limit} calls this month). Resets at the start of next month.`;
    return NextResponse.json({ error: message }, { status: usage.reason === "key_not_scoped" ? 403 : 402 });
  }

  let body: { botId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  if (!body.botId || typeof body.botId !== "string") {
    return NextResponse.json({ error: "Missing required field: botId" }, { status: 400 });
  }
  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json({ error: "Missing required field: message" }, { status: 400 });
  }
  if (body.message.length > 500) {
    return NextResponse.json({ error: "message must be 500 characters or fewer" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Ownership check — an API key can only query bots belonging to the
  // same account it authenticates as, never someone else's bot by id.
  const { data: bot } = await admin
    .from("bots")
    .select("id, persona, site_content, model, escalation_contact")
    .eq("id", body.botId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!bot) {
    return NextResponse.json({ error: "No bot with that id on this account." }, { status: 404 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Chatbot isn't configured yet" }, { status: 500 });
  }

  let systemPrompt = bot.persona as string;
  if (bot.site_content) {
    systemPrompt += `\n\nYou have the following information about the business's website. Use it to answer questions accurately. If something isn't covered by this content, say you're not sure rather than making it up.\n\n--- WEBSITE CONTENT ---\n${bot.site_content}\n--- END WEBSITE CONTENT ---`;
  }
  if (bot.escalation_contact) {
    systemPrompt += `\n\nIf you don't know the answer, tell the user they can reach the business directly at ${bot.escalation_contact} instead of guessing.`;
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: (bot.model as string) || "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.message },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Groq API error (v1/chatbot/query):", res.status, errText);
      return NextResponse.json({ error: "The chatbot is having trouble right now." }, { status: 502 });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't come up with a reply.";

    await logApiUsage(auth.userId, "chatbot", "chatbot_query");

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("v1/chatbot/query error:", err);
    return NextResponse.json({ error: "The chatbot is having trouble right now." }, { status: 502 });
  }
}

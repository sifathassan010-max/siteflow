import { createClient } from "@/lib/supabase/server";
import { DEFAULT_GROQ_MODEL } from "@/lib/groq-models";
import { checkPreviewAllowance } from "@/lib/chat-limits";
import { extractTokenUsage } from "@/lib/chat-limits-core";
import { logUsage } from "@/lib/usage";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a friendly, helpful AI chatbot demo for SiteFlow.
You're showing website owners what SiteFlow's Chatbot Builder tool can do:
answer visitor questions instantly using AI, trained on their own site content.
Keep answers short (2-4 sentences), warm, and helpful. If asked what you are,
explain you're a live demo of SiteFlow's chatbot builder, and that a real one
gets trained on the business's own website content instead of general knowledge.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { message } = await request.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  if (message.length > 500) {
    return NextResponse.json({ error: "Message too long for the demo" }, { status: 400 });
  }

  const preview = await checkPreviewAllowance(user.id);
  if (!preview.allowed) {
    return NextResponse.json(
      { error: `Daily demo limit reached (${preview.limit} messages). Try again after 00:00 UTC.` },
      { status: 429, headers: { "Retry-After": String(preview.retryAfterSeconds) } }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Chatbot demo isn't configured yet" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_GROQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Groq API error:", res.status, errText);
      return NextResponse.json(
        { error: "The demo bot is having trouble right now. Try again in a moment." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't come up with a reply.";

    await logUsage(
      user.id,
      "free_chatbot_preview",
      "message",
      1,
      extractTokenUsage(data, DEFAULT_GROQ_MODEL)
    );

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chatbot preview error:", err);
    return NextResponse.json(
      { error: "The demo bot is having trouble right now. Try again in a moment." },
      { status: 500 }
    );
  }
}

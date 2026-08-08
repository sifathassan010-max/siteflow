import { createClient } from "@/lib/supabase/server";
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
        model: "llama-3.1-8b-instant",
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

    await supabase.from("usage_events").insert({
      user_id: user.id,
      tool: "free_chatbot_preview",
      event_type: "message",
      quantity: 1,
    });

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chatbot preview error:", err);
    return NextResponse.json(
      { error: "The demo bot is having trouble right now. Try again in a moment." },
      { status: 500 }
    );
  }
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Groq models available to pick between in the widget appearance/settings
// form. Keep this list short and validate against it server-side so a bad
// value can't get stored and silently break the chat route.
export const ALLOWED_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"] as const;

export async function GET(
  _request: Request,
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

  const { data: bot, error } = await supabase
    .from("bots")
    .select(
      "id, name, persona, website_url, quick_prompts, widget_color, logo_url, escalation_contact, model, trained_pages, last_trained_at, created_at"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  return NextResponse.json({ bot });
}

export async function PATCH(
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

  const { data: existing } = await supabase
    .from("bots")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (typeof body.persona === "string") {
    update.persona = body.persona.trim() || "You are a helpful, friendly assistant for this business.";
  }

  if (Array.isArray(body.quick_prompts)) {
    update.quick_prompts = body.quick_prompts
      .filter((p: unknown) => typeof p === "string" && p.trim())
      .map((p: string) => p.trim())
      .slice(0, 6);
  }

  if (typeof body.widget_color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.widget_color)) {
    update.widget_color = body.widget_color;
  }

  if (typeof body.logo_url === "string") {
    update.logo_url = body.logo_url.trim() || null;
  }

  if (typeof body.escalation_contact === "string") {
    update.escalation_contact = body.escalation_contact.trim() || null;
  }

  if (typeof body.model === "string") {
    if (!ALLOWED_MODELS.includes(body.model as (typeof ALLOWED_MODELS)[number])) {
      return NextResponse.json({ error: "Invalid model choice" }, { status: 400 });
    }
    update.model = body.model;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data: bot, error } = await supabase
    .from("bots")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(
      "id, name, persona, website_url, quick_prompts, widget_color, logo_url, escalation_contact, model, trained_pages, last_trained_at, created_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bot });
}

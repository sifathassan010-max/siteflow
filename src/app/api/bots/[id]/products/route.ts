import { createClient } from "@/lib/supabase/server";
import { clearProducts } from "@/lib/product-store";
import { NextResponse } from "next/server";

// Deletes the whole product catalog of one bot (the bot itself is kept).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: bot } = await supabase
    .from("bots")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 });

  const ok = await clearProducts(bot.id);
  if (!ok) {
    return NextResponse.json({ error: "Couldn't delete the products. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

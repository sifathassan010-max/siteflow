import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_SITES_PER_USER = 10;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data: sites, error } = await supabase
    .from("analytics_sites")
    .select("id, name, domain, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sites });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { name, domain } = await request.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Site name is required" }, { status: 400 });
  }
  if (!domain || typeof domain !== "string" || !domain.trim()) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  const { count } = await supabase
    .from("analytics_sites")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= MAX_SITES_PER_USER) {
    return NextResponse.json(
      { error: `You've hit the limit of ${MAX_SITES_PER_USER} sites per account.` },
      { status: 400 }
    );
  }

  const { data: site, error } = await supabase
    .from("analytics_sites")
    .insert({ user_id: user.id, name: name.trim(), domain: domain.trim() })
    .select("id, name, domain, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ site });
}

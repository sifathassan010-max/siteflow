import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_PROJECTS_PER_USER = 10;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data: projects, error } = await supabase
    .from("seo_projects")
    .select("id, name, root_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { name, root_url: rootUrlInput } = await request.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  let rootUrl: URL;
  try {
    rootUrl = new URL(rootUrlInput);
    if (!["http:", "https:"].includes(rootUrl.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid URL" }, { status: 400 });
  }

  const { count } = await supabase
    .from("seo_projects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= MAX_PROJECTS_PER_USER) {
    return NextResponse.json(
      { error: `You've hit the limit of ${MAX_PROJECTS_PER_USER} SEO projects per account.` },
      { status: 400 }
    );
  }

  const { data: project, error } = await supabase
    .from("seo_projects")
    .insert({ user_id: user.id, name: name.trim(), root_url: rootUrl.toString() })
    .select("id, name, root_url, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project });
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { url } = await request.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
    if (!["http:", "https:"].includes(target.protocol)) {
      throw new Error("bad protocol");
    }
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid URL" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(target.toString(), {
      headers: { "User-Agent": "SiteFlow-MetaChecker/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `That page returned an error (status ${res.status})` },
        { status: 400 }
      );
    }
    html = await res.text();
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach that URL. Check it's correct and publicly accessible." },
      { status: 400 }
    );
  }

  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() ?? "";
  const ogDescription = $('meta[property="og:description"]').attr("content")?.trim() ?? "";
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() ?? "";
  const h1Count = $("h1").length;
  const h1Text = $("h1").first().text().trim();

  function checkLength(
    value: string,
    min: number,
    max: number
  ): { status: "good" | "warn" | "missing"; message: string } {
    if (!value) return { status: "missing", message: "Missing entirely" };
    if (value.length < min)
      return { status: "warn", message: `A bit short (${value.length} chars, aim for ${min}-${max})` };
    if (value.length > max)
      return { status: "warn", message: `A bit long (${value.length} chars, aim for ${min}-${max})` };
    return { status: "good", message: `Good length (${value.length} chars)` };
  }

  // Log usage for your own visibility, no hard limit on this free tool.
  await supabase.from("usage_events").insert({
    user_id: user.id,
    tool: "free_meta_checker",
    event_type: "check",
    quantity: 1,
  });

  return NextResponse.json({
    url: target.toString(),
    title: { value: title, check: checkLength(title, 30, 60) },
    description: { value: description, check: checkLength(description, 120, 160) },
    ogTitle: { value: ogTitle, present: !!ogTitle },
    ogDescription: { value: ogDescription, present: !!ogDescription },
    canonical: { value: canonical, present: !!canonical },
    h1: { count: h1Count, text: h1Text, good: h1Count === 1 },
  });
}

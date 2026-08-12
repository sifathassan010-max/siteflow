import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_EVENTS_FETCHED = 5000;

export async function GET(
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

  const { data: site } = await supabase
    .from("analytics_sites")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(1, Number(searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: events, error } = await supabase
    .from("analytics_events")
    .select("path, referrer, visitor_hash, created_at")
    .eq("site_id", id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX_EVENTS_FETCHED);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = events ?? [];

  // Pageviews per day, oldest to newest, zero-filled so the chart has no gaps.
  const byDay = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    byDay.set(d, 0);
  }
  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const pageviewsByDay = Array.from(byDay.entries()).map(([date, count]) => ({ date, count }));

  const pathCounts = new Map<string, number>();
  const referrerCounts = new Map<string, number>();
  const uniqueHashes = new Set<string>();

  for (const row of rows) {
    pathCounts.set(row.path, (pathCounts.get(row.path) ?? 0) + 1);
    const ref = row.referrer && row.referrer.trim() ? row.referrer : "Direct";
    referrerCounts.set(ref, (referrerCounts.get(ref) ?? 0) + 1);
    if (row.visitor_hash) uniqueHashes.add(row.visitor_hash);
  }

  const topPages = Array.from(pathCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  const topReferrers = Array.from(referrerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([referrer, count]) => ({ referrer, count }));

  return NextResponse.json({
    totalPageviews: rows.length,
    uniqueVisitors: uniqueHashes.size,
    pageviewsByDay,
    topPages,
    topReferrers,
    truncated: rows.length >= MAX_EVENTS_FETCHED,
  });
}

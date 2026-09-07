"use client";

import { useEffect, useState } from "react";

type Stats = {
  totalPageviews: number;
  uniqueVisitors: number;
  pageviewsByDay: { date: string; count: number }[];
  topPages: { path: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  truncated: boolean;
};

function BarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const width = 700;
  const height = 140;
  const barGap = 2;
  const barWidth = data.length > 0 ? width / data.length - barGap : 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Pageviews by day">
      {data.map((d, i) => {
        const barHeight = (d.count / max) * (height - 20);
        const x = i * (barWidth + barGap);
        const y = height - barHeight;
        return (
          <g key={d.date}>
            <rect
              x={x}
              y={y}
              width={Math.max(1, barWidth)}
              height={barHeight}
              rx={2}
              className="fill-brand/80"
            >
              <title>
                {d.date}: {d.count}
              </title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}

export default function StatsDashboard({ siteId }: { siteId: string }) {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStats(null);
    fetch(`/api/analytics/sites/${siteId}/stats?days=${days}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch(() => !cancelled && setError("Couldn't load stats"));
    return () => {
      cancelled = true;
    };
  }, [siteId, days]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              days === d
                ? "bg-brand text-white"
                : "border border-line text-slate hover:border-ink/30"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!stats && !error && <p className="text-sm text-slate">Loading stats…</p>}

      {stats && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-line bg-white p-4">
              <p className="text-xs font-semibold text-slate">Pageviews</p>
              <p className="mt-1 text-2xl font-bold">{stats.totalPageviews.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-4">
              <p className="text-xs font-semibold text-slate">Unique visitors (est.)</p>
              <p className="mt-1 text-2xl font-bold">{stats.uniqueVisitors.toLocaleString()}</p>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-4">
            <p className="text-xs font-semibold text-slate">Pageviews by day</p>
            <div className="mt-3">
              <BarChart data={stats.pageviewsByDay} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-white p-4">
              <p className="text-xs font-semibold text-slate">Top pages</p>
              {stats.topPages.length === 0 ? (
                <p className="mt-2 text-sm text-slate">No data yet</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {stats.topPages.map((p) => (
                    <li key={p.path} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-ink/80">{p.path}</span>
                      <span className="shrink-0 font-semibold">{p.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-line bg-white p-4">
              <p className="text-xs font-semibold text-slate">Top referrers</p>
              {stats.topReferrers.length === 0 ? (
                <p className="mt-2 text-sm text-slate">No data yet</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {stats.topReferrers.map((r) => (
                    <li
                      key={r.referrer}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate text-ink/80">{r.referrer}</span>
                      <span className="shrink-0 font-semibold">{r.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {stats.truncated && (
            <p className="text-xs text-slate">
              Showing the most recent {5000} events for this period — older
              events in range aren&apos;t included in these totals.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

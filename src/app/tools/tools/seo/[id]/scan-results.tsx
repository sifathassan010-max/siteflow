type PageAudit = {
  url: string;
  statusCode: number | null;
  title: string;
  score: number;
  issues: string[];
  error?: string;
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-flow/10 text-flow"
      : score >= 50
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      {score}/100
    </span>
  );
}

export default function ScanResults({
  overallScore,
  pages,
  scannedAt,
}: {
  overallScore: number | null;
  pages: PageAudit[];
  scannedAt: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
        <div>
          <p className="text-xs font-semibold text-slate">Overall score</p>
          <p className="text-2xl font-bold">{overallScore ?? "—"}/100</p>
        </div>
        <div className="ml-auto text-right text-xs text-slate">
          <p>{pages.length} page(s) scanned</p>
          <p>{new Date(scannedAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {pages.map((page) => (
          <div key={page.url} className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{page.title || "(no title)"}</p>
                <p className="truncate text-xs text-slate">{page.url}</p>
              </div>
              <ScoreBadge score={page.score} />
            </div>

            {page.issues.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {page.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
                    {issue}
                  </li>
                ))}
              </ul>
            )}

            {page.issues.length === 0 && !page.error && (
              <p className="mt-3 text-sm text-flow">No issues found</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

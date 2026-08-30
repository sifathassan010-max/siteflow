import Link from "next/link";
import { checkUsageLimit } from "@/lib/usage";

const UNIT_LABEL: Record<string, string> = {
  chatbot: "messages",
  seo: "pages scanned",
  forms: "submissions",
  analytics: "pageviews",
};

// Drop this at the top of any paid tool's main page.tsx (right under the
// intro paragraph). Shows nothing for paid/active subscribers. Shows a
// trial progress bar + pricing link for everyone else, so people see
// they're approaching the wall before they hit it, not just after.
export default async function UsageBanner({
  userId,
  tool,
}: {
  userId: string;
  tool: string;
}) {
  const usage = await checkUsageLimit(userId, tool);

  // Paid + active — nothing to show.
  if ("used" in usage === false) return null;

  const { used, limit } = usage;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  const unit = UNIT_LABEL[tool] ?? "used";
  const isNearLimit = pct >= 80;

  return (
    <div className="mt-4 rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between text-sm">
        <p className="font-semibold">
          Free trial: {used}/{limit} {unit} used
        </p>
        <Link href="/pricing" className="font-semibold text-brand hover:underline">
          See the Pricing →
        </Link>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
        <div
          className={`h-full rounded-full ${isNearLimit ? "bg-red-500" : "bg-brand"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

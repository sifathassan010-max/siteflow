import { checkUsageLimit } from "@/lib/usage";
import { getChatUsageSummary } from "@/lib/chat-limits";

function Bar({ label, used, limit, resets }: { label: string; used: number; limit: number; resets: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <p className="font-semibold">
          {used.toLocaleString("en-US")} / {limit.toLocaleString("en-US")} {label}
        </p>
        <p className="text-xs text-slate">{resets}</p>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
        <div
          className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : "bg-brand"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Paid + active accounts only (trial users see UsageBanner instead).
export default async function ChatUsageMeter({ userId }: { userId: string }) {
  const base = await checkUsageLimit(userId, "chatbot");
  if ("used" in base) return null;

  const s = await getChatUsageSummary(userId);
  return (
    <div className="mt-4 flex flex-col gap-4 rounded-xl border border-line bg-white p-4">
      <Bar label="messages this month" used={s.month} limit={s.monthLimit} resets="resets 1st, 00:00 UTC" />
      <Bar label="messages today" used={s.day} limit={s.dayLimit} resets="resets 00:00 UTC" />
      <p className="text-xs text-slate">
        Counts every visitor message answered by any of your bots, plus your own test messages.
      </p>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import Link from "next/link";

const TOOLS = [
  { name: "Chatbot builder", href: "/tools/chatbot", desc: "Answer visitors with an AI chatbot" },
  { name: "SEO", href: "/tools/seo", desc: "Scan and improve your pages" },
  { name: "Forms & Leads", href: "/tools/forms", desc: "Capture leads from your site" },
  { name: "Analytics", href: "/tools/analytics", desc: "See your traffic, privacy-friendly" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <DashboardShell email={user.email ?? ""}>
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-slate">Pick a tool to get started.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-2xl border border-line bg-white p-5 transition hover:border-ink/20 hover:shadow-sm"
          >
            <h3 className="font-bold">{tool.name}</h3>
            <p className="mt-1 text-sm text-slate">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}

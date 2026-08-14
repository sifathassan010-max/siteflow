import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Script from "next/script";
import DashboardShell from "@/components/dashboard-shell";
import ChatbotPreviewWidget from "./chatbot-preview-widget";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell email={user.email ?? ""}>
      {/*
        Clickadilla ad code — scoped to this page only, per instruction.
        `strategy="afterInteractive"` is the Next.js-correct way to load a
        third-party script (loads once the page is interactive, not a raw
        <script> tag which can cause hydration warnings in the App Router).
      */}
      <Script
        src="https://js.wpadmngr.com/static/adManager.js"
        data-admpid="452827"
        strategy="afterInteractive"
      />

      <h1 className="text-2xl font-bold">Free chatbot preview</h1>
      <p className="mt-2 max-w-lg text-slate">
        Try a live demo of what SiteFlow&apos;s Chatbot Builder can do. This
        demo answers from general knowledge — a real one gets trained on your
        own website content instead.
      </p>
      <div className="mt-6">
        <ChatbotPreviewWidget />
      </div>

      {/* Clickadilla banner placement — bottom of page, per instruction. */}
      <div className="mt-10">
        <div data-banner-id="1498937"></div>
      </div>
    </DashboardShell>
  );
}

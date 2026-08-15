import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard-shell";
import PublicToolShell from "@/components/public-tool-shell";
import AdBanner from "@/components/ad-banner";
import ChatbotPreviewWidget from "./chatbot-preview-widget";

const INTRO = (
  <>
    <h1 className="text-2xl font-bold">Free chatbot preview</h1>
    <p className="mt-2 max-w-lg text-slate">
      Try a live demo of what SiteFlow&apos;s Chatbot Builder can do. This
      demo answers from general knowledge — a real one gets trained on your
      own website content instead.
    </p>
  </>
);

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <PublicToolShell>
        {INTRO}
        <div className="mt-6">
          <ChatbotPreviewWidget />
        </div>
        <AdBanner />
      </PublicToolShell>
    );
  }

  return (
    <DashboardShell email={user.email ?? ""}>
      {INTRO}
      <div className="mt-6">
        <ChatbotPreviewWidget />
      </div>

      <AdBanner />
    </DashboardShell>
  );
}

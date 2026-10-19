import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard-shell";
import PublicToolShell from "@/components/public-tool-shell";
import AdBanner from "@/components/ad-banner";
import AdBannerTop from "@/components/ad-banner-top";
import ChatbotPreviewWidget from "./chatbot-preview-widget";

export const metadata: Metadata = {
  title: "Free AI Chatbot Demo for Your Website | SiteFlow",
  description:
    "Try a live demo of SiteFlow's AI chatbot builder for small business websites. See how it answers visitor questions before training one on your own site content.",
  alternates: { canonical: "/tools/free/chatbot-preview" },
  openGraph: {
    title: "Free AI Chatbot Demo for Your Website | SiteFlow",
    description: "Try a live demo of SiteFlow's AI chatbot builder for small business websites.",
    url: "/tools/free/chatbot-preview",
  },
};

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
        <AdBannerTop />
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
      <AdBannerTop />
      <div className="mt-6">
        <ChatbotPreviewWidget />
      </div>

      <AdBanner />
    </DashboardShell>
  );
}

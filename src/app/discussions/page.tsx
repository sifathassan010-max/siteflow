import type { Metadata } from "next";
import Nav from "@/components/nav";

export const metadata: Metadata = {
  title: "Discussions — Ask Questions & Share Tips for Small Business Websites | SiteFlow",
  description:
    "Join SiteFlow's community discussions to ask questions and share tips on running a small business website — chatbots, SEO, lead forms, and analytics.",
  alternates: { canonical: "/discussions" },
  openGraph: {
    title: "SiteFlow Discussions — Community Q&A for Small Business Websites",
    description: "Ask questions and share tips with other small business website owners.",
    url: "/discussions",
  },
};

export default function DiscussionsPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Discussions</h1>
        <p className="mt-3 max-w-md text-slate">
          Coming soon — a place for SiteFlow users to ask questions, share
          tips, and talk to each other.
        </p>
      </main>
      <footer className="border-t border-line py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-slate">
          SiteFlow
        </div>
      </footer>
    </div>
  );
}

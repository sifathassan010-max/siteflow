import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In to SiteFlow",
  description:
    "Log in to your SiteFlow account to manage your AI chatbot, SEO audits, lead-capture forms, and website analytics.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

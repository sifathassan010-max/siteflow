import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start a New Thread — SiteFlow Discussions",
  description: "Start a new discussion thread on SiteFlow. Requires an account.",
  alternates: { canonical: "/discussions/new" },
  robots: { index: false, follow: true },
};

export default function NewThreadLayout({ children }: { children: React.ReactNode }) {
  return children;
}

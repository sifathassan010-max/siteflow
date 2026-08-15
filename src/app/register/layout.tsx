import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a Free SiteFlow Account",
  description:
    "Sign up free and start using SiteFlow's AI chatbot builder, SEO audit tool, lead-capture forms, and website analytics for your small business site.",
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}

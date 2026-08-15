import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site-url";

// Note: swapped next/font/google for system fonts here since this sandbox
// can't reach fonts.googleapis.com. Vercel's build servers can reach it fine,
// so feel free to switch back to next/font/google (or a real brand font)
// once we get to the actual design pass.

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SiteFlow — AI Chatbot, SEO, Forms & Analytics for Small Business Websites",
    template: "%s",
  },
  description:
    "SiteFlow is an all-in-one toolkit for small business websites: an AI chatbot trained on your own content, an SEO audit tool, lead-capture forms, and privacy-friendly analytics — one login, one flow.",
  openGraph: {
    siteName: "SiteFlow",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "SiteFlow",
      url: SITE_URL,
    },
    {
      "@type": "WebSite",
      name: "SiteFlow",
      url: SITE_URL,
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// Auto-served at /robots.txt by Next.js.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/dashboard/",
        "/api/",
        "/auth/",
        "/embed/",
        "/tools/chatbot/",
        "/tools/seo/",
        "/tools/forms/",
        "/tools/analytics/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

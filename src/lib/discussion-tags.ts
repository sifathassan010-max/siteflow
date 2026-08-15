// ============================================================
// DISCUSSIONS — SUGGESTED TAGS
// New threads must pick 5–10 tags from this list (no freeform
// tags) so tagging stays consistent and the site's own SEO
// doesn't depend on each user picking good keywords themselves.
// Edit this file to add, remove, or rename a tag anywhere on
// the site — the new-thread picker and thread pages both read
// from here.
// ============================================================

export const MIN_TAGS = 5;
export const MAX_TAGS = 10;

export const TAG_GROUPS: { group: string; tags: string[] }[] = [
  {
    group: "Chatbot",
    tags: [
      "ai-chatbot",
      "chatbot-training",
      "live-chat",
      "lead-capture",
      "chatbot-widget",
    ],
  },
  {
    group: "SEO",
    tags: [
      "seo",
      "sitemap",
      "meta-tags",
      "site-audit",
      "google-indexing",
      "keyword-research",
    ],
  },
  {
    group: "Forms & leads",
    tags: ["forms", "lead-generation", "embeds", "conversion-rate"],
  },
  {
    group: "Analytics",
    tags: ["analytics", "website-traffic", "privacy", "no-cookie-banner"],
  },
  {
    group: "Running a small business site",
    tags: [
      "small-business",
      "wordpress",
      "ecommerce",
      "web-design",
      "marketing",
      "getting-started",
    ],
  },
  {
    group: "Site & feedback",
    tags: ["feature-request", "bug-report", "troubleshooting", "general-discussion"],
  },
];

export const ALL_TAGS: string[] = TAG_GROUPS.flatMap((g) => g.tags);

export function isValidTagSelection(tags: unknown): tags is string[] {
  if (!Array.isArray(tags)) return false;
  if (tags.length < MIN_TAGS || tags.length > MAX_TAGS) return false;
  if (new Set(tags).size !== tags.length) return false;
  return tags.every((t) => typeof t === "string" && ALL_TAGS.includes(t));
}

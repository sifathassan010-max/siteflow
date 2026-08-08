// ============================================================
// SITE NAVIGATION CONFIG
// Edit this file to add, remove, or rename any nav button
// anywhere on the site (public homepage nav AND the logged-in
// dashboard/tools top bar both read from this same file).
// ============================================================

// The 4 paid tools. Shown as top-bar links everywhere.
export const TOOLS = [
  { name: "Chatbot builder", href: "/tools/chatbot" },
  { name: "SEO", href: "/tools/seo" },
  { name: "Forms & Leads", href: "/tools/forms" },
  { name: "Analytics", href: "/tools/analytics" },
];

// Shown inside the "Free tools" dropdown.
export const FREE_TOOLS = [
  { name: "Meta tag checker", href: "/tools/free/meta-tags" },
  { name: "Chatbot preview", href: "/tools/free/chatbot-preview" },
];

// Extra standalone top-bar links (not tools, not a dropdown).
// TO ADD A NEW TOP-BAR BUTTON:
//   1. Add a line here, e.g. { name: "Blog", href: "/blog" }
//   2. Create the matching page: src/app/blog/page.tsx
// TO REMOVE ONE: just delete its line here. The page file can
// stay on disk unused, or you can delete that too.
export const TOP_LINKS = [
  { name: "Pricing", href: "/pricing" },
  { name: "Discussions", href: "/discussions" },
];

// Left sidebar links shown on /dashboard and all /tools/* pages.
// Same idea: add a line + create the page to add a new sidebar item.
export const SIDEBAR_LINKS = [
  { name: "Overview", href: "/dashboard" },
  { name: "Profile", href: "/dashboard/profile" },
  { name: "Account", href: "/dashboard/account" },
  { name: "Settings", href: "/dashboard/settings" },
];

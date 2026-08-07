import type { Metadata } from "next";
import "./globals.css";

// Note: swapped next/font/google for system fonts here since this sandbox
// can't reach fonts.googleapis.com. Vercel's build servers can reach it fine,
// so feel free to switch back to next/font/google (or a real brand font)
// once we get to the actual design pass.

export const metadata: Metadata = {
  title: "SaaS Suite (placeholder name)",
  description: "Placeholder — real title/description set once branding is locked.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

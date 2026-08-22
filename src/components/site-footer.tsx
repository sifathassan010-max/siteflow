import Link from "next/link";
import { TOOLS, FREE_TOOLS, TOP_LINKS } from "@/lib/site-config";

const TRUST_LINKS = [
  { name: "Security", href: "/security" },
  { name: "Trust Center", href: "/trust" },
  { name: "Subprocessors", href: "/subprocessors" },
];

const LEGAL_LINKS = [
  { name: "Terms of Service", href: "/legal/terms" },
  { name: "Privacy Policy", href: "/legal/privacy" },
  { name: "Refund Policy", href: "/legal/refund" },
];

const SUPPORT_EMAIL = "sifathassan010@gmail.com";

const SUPPORT_LINKS = [{ name: "Contact / Support", href: `mailto:${SUPPORT_EMAIL}` }];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { name: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-slate transition hover:text-ink">
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="max-w-xs">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Site<span className="text-brand">Flow</span>
          </Link>
          <p className="mt-3 text-sm text-slate">
            Chatbot, forms, SEO, and analytics, built for people running a small business
            website, not a dev team.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 inline-block text-sm text-slate transition hover:text-ink"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          <FooterColumn title="Product" links={TOOLS} />
          <FooterColumn title="Free tools" links={FREE_TOOLS} />
          <FooterColumn title="Company" links={TOP_LINKS} />
          <FooterColumn title="Trust & Security" links={TRUST_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
          <FooterColumn title="Support" links={SUPPORT_LINKS} />
        </div>

        <div className="mt-12 border-t border-line pt-6 text-sm text-slate">
          <p>SiteFlow — a brand operated by Necro Animation Studio</p>
          <p className="mt-1">© {new Date().getFullYear()} SiteFlow. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

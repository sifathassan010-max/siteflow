import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-line py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center text-sm text-slate">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/legal/terms" className="hover:text-ink">
            Terms of Service
          </Link>
          <Link href="/legal/privacy" className="hover:text-ink">
            Privacy Policy
          </Link>
          <Link href="/legal/refund" className="hover:text-ink">
            Refund Policy
          </Link>
        </div>
        <div>SiteFlow — a brand operated by Necro Animation Studio</div>
      </div>
    </footer>
  );
}

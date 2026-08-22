import Nav from "@/components/nav";
import SiteFooter from "@/components/site-footer";

export default function PublicToolShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}

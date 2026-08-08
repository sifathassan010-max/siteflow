import Nav from "@/components/nav";

export default function DiscussionsPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Discussions</h1>
        <p className="mt-3 max-w-md text-slate">
          Coming soon — a place for SiteFlow users to ask questions, share
          tips, and talk to each other.
        </p>
      </main>
      <footer className="border-t border-line py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-slate">
          SiteFlow
        </div>
      </footer>
    </div>
  );
}

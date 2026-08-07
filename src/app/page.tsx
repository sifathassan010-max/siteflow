export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold">Project scaffold live</h1>
      <p className="max-w-md text-neutral-500">
        This is a placeholder. Real landing page design comes once the 4 tools
        and free-tools nav are ready to wire up.
      </p>
      <p className="text-sm text-neutral-400">
        Check <code>/api/health</code> once deployed to confirm the pipeline works.
      </p>
    </main>
  );
}

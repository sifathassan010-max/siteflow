import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "./sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this route, but double-check server-side too.
  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-neutral-500">Logged in as {user.email}</p>
      <p className="text-sm text-neutral-400 max-w-sm text-center">
        The 4 tools (Chatbot, SEO, Forms, Analytics) will render here as tabs
        once each one is built — this confirms auth is fully wired.
      </p>
      <SignOutButton />
    </main>
  );
}

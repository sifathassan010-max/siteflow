"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-2">Log in to SiteFlow</h1>
        <p className="text-neutral-500 mb-6">
          We&apos;ll email you a login link — no password needed.
        </p>

        {status === "sent" ? (
          <p className="rounded-md bg-green-50 text-green-700 p-4 text-sm">
            Check your inbox — click the link we sent to {email} to finish
            logging in.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="bg-black text-white rounded-md px-3 py-2 disabled:opacity-50"
            >
              {status === "sending" ? "Sending link…" : "Send login link"}
            </button>
            {status === "error" && (
              <p className="text-red-600 text-sm">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}

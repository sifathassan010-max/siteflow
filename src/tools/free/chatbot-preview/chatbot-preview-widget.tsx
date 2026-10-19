"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { redirectToLoginIfUnauthorized } from "@/lib/auth-redirect";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatbotPreviewWidget() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm a live demo of SiteFlow's chatbot builder. Ask me anything.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tools/chatbot-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (redirectToLoginIfUnauthorized(res.status, router)) return;
        setError(data.error ?? "Something went wrong");
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl overflow-hidden rounded-2xl border border-line bg-white">
      <div ref={scrollRef} className="flex h-96 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              "max-w-[80%] rounded-2xl px-4 py-2 text-sm " +
              (m.role === "user"
                ? "self-end bg-brand text-white"
                : "self-start bg-canvas text-ink")
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="self-start rounded-2xl bg-canvas px-4 py-2 text-sm text-slate">
            Typing…
          </div>
        )}
      </div>

      {error && <p className="px-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-line p-3">
        <input
          type="text"
          placeholder="Ask me anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-lg border border-line px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <div className="border-t border-line bg-brand-bg px-4 py-3 text-center">
        <p className="text-sm text-ink/80">
          Like this? A real one gets trained on{" "}
          <span className="font-semibold">your own website</span>.
        </p>
        <Link
          href="/tools/chatbot"
          className="mt-1 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Build your own chatbot →
        </Link>
      </div>
    </div>
  );
}

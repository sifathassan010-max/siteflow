"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { CustomQuery } from "@/lib/chatbot-custom-queries";
import { AVATAR_MIN_SIZE, type BotAvatarConfig } from "@/lib/chatbot-bot-avatars";

type Message = { role: "user" | "assistant"; content: string };

export default function EmbedChatWidget({
  botId,
  botName,
  quickPrompts,
  widgetColor,
  logoUrl,
  escalationContact,
  customQueries = [],
  avatarConfig = null,
}: {
  botId: string;
  botName: string;
  quickPrompts: string[];
  widgetColor: string;
  logoUrl: string | null;
  escalationContact: string | null;
  customQueries?: CustomQuery[];
  avatarConfig?: BotAvatarConfig | null;
}) {
  const [expandedQueryIndex, setExpandedQueryIndex] = useState<number | null>(null);

  // Bot avatar: single image/GIF, or a rotating set of 2-4 (paid feature).
  // Clicking the avatar minimizes it into a small circle pinned above the
  // message box, labeled with the bot's name; clicking that circle
  // restores the full-size avatar in the header.
  const avatars = useMemo(
    () => (avatarConfig?.avatars ?? []).filter((a) => a.url),
    [avatarConfig]
  );
  const hasAvatar = avatars.length > 0;
  const [activeAvatarIndex, setActiveAvatarIndex] = useState(0);
  const [avatarMinimized, setAvatarMinimized] = useState(false);
  const [avatarTransitioning, setAvatarTransitioning] = useState(false);
  const activeAvatar = avatars[activeAvatarIndex % avatars.length] ?? null;

  useEffect(() => {
    if (avatarConfig?.mode !== "multiple" || avatars.length < 2) return;
    const intervalMs = Math.max(avatarConfig.frequencySeconds, 1) * 1000;
    const id = setInterval(() => {
      // Minimize the current avatar, then swap to the next one and grow
      // it back in — mirrors the manual minimize/restore interaction.
      setAvatarTransitioning(true);
      setTimeout(() => {
        setActiveAvatarIndex((i) => (i + 1) % avatars.length);
        setAvatarTransitioning(false);
      }, 250);
    }, intervalMs);
    return () => clearInterval(id);
  }, [avatarConfig?.mode, avatarConfig?.frequencySeconds, avatars.length]);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Hi! I'm ${botName}. How can I help?` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // One id per visitor per browser tab, reused across page reloads within
  // the same tab so the conversation stays grouped in the owner's chat
  // history. Not tied to login — visitors never log in to use the widget.
  const sessionIdRef = useRef<string>("");
  if (!sessionIdRef.current && typeof window !== "undefined") {
    const storageKey = `siteflow_chat_session_${botId}`;
    sessionIdRef.current =
      window.sessionStorage.getItem(storageKey) ??
      (() => {
        const id = crypto.randomUUID();
        window.sessionStorage.setItem(storageKey, id);
        return id;
      })();
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text || loading) return;

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/embed/${botId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: sessionIdRef.current }),
      });
      const data = await res.json();

      if (!res.ok) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
  }

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadEmail.trim()) return;
    setLeadSubmitting(true);
    try {
      const res = await fetch(`/api/embed/${botId}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          sessionId: sessionIdRef.current,
        }),
      });
      if (res.ok) {
        setLeadSubmitted(true);
      }
    } finally {
      setLeadSubmitting(false);
    }
  }

  // Quick Prompts only make sense before the visitor has said anything —
  // once they're mid-conversation the buttons would just get in the way.
  const showQuickPrompts = quickPrompts.length > 0 && messages.length === 1 && !loading;
  const showCustomQueries = customQueries.length > 0 && messages.length === 1 && !loading;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          {hasAvatar && activeAvatar && !avatarMinimized ? (
            <button
              type="button"
              onClick={() => setAvatarMinimized(true)}
              title="Minimize avatar"
              className="shrink-0 overflow-hidden rounded-full border border-line transition-transform duration-300 ease-out"
              style={{
                width: activeAvatar.size,
                height: activeAvatar.size,
                transform: avatarTransitioning ? "scale(0.15)" : "scale(1)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeAvatar.url} alt="" className="h-full w-full object-cover" />
            </button>
          ) : (
            !hasAvatar &&
            logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-6 w-6 rounded object-contain" />
            )
          )}
          <p className="text-sm font-semibold">{botName}</p>
        </div>
        <button
          onClick={() => setShowLeadForm((v) => !v)}
          className="text-xs font-medium text-slate hover:text-ink"
        >
          {showLeadForm ? "Back to chat" : "Leave your info"}
        </button>
      </div>

      {showLeadForm ? (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {leadSubmitted ? (
            <p className="text-sm text-slate">
              Thanks! We&apos;ve got your info and will follow up soon.
            </p>
          ) : (
            <form onSubmit={handleLeadSubmit} className="flex flex-col gap-3">
              <p className="text-sm text-slate">
                Want someone to follow up with you directly? Leave your info
                below.
              </p>
              <input
                type="text"
                placeholder="Name (optional)"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="rounded-lg border border-line px-3 py-2 text-sm"
              />
              <input
                type="email"
                required
                placeholder="Email"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                className="rounded-lg border border-line px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={leadSubmitting}
                style={{ backgroundColor: widgetColor }}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {leadSubmitting ? "Sending…" : "Submit"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                style={m.role === "user" ? { backgroundColor: widgetColor } : undefined}
                className={
                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm " +
                  (m.role === "user" ? "self-end text-white" : "self-start bg-canvas text-ink")
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

            {showQuickPrompts && (
              <div className="flex flex-wrap gap-2 pt-2">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition hover:border-ink/30"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {showCustomQueries && (
              <div className="flex flex-col gap-2 pt-3">
                <p className="text-xs font-semibold text-slate">Common questions</p>
                {customQueries.map((q, i) => {
                  const isExpanded = expandedQueryIndex === i;
                  return (
                    <div key={i} className="overflow-hidden rounded-lg border border-line">
                      <button
                        type="button"
                        onClick={() => setExpandedQueryIndex(isExpanded ? null : i)}
                        style={{ color: q.color }}
                        className="w-full px-3 py-2 text-left text-sm font-semibold"
                      >
                        {q.question}
                      </button>
                      {isExpanded && q.description && (
                        <p className="whitespace-pre-wrap border-t border-line bg-canvas px-3 py-2 text-sm text-ink">
                          {q.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="px-4 pb-2 text-sm text-red-600">{error}</p>}

          {hasAvatar && activeAvatar && avatarMinimized && (
            <div className="flex justify-center border-t border-line bg-canvas px-4 py-1.5">
              <button
                type="button"
                onClick={() => setAvatarMinimized(false)}
                title="Expand avatar"
                className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-3 text-xs font-medium text-slate transition hover:bg-white"
              >
                <span
                  className="shrink-0 overflow-hidden rounded-full border border-line transition-transform duration-300 ease-out"
                  style={{
                    width: AVATAR_MIN_SIZE,
                    height: AVATAR_MIN_SIZE,
                    transform: avatarTransitioning ? "scale(0.15)" : "scale(1)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeAvatar.url} alt="" className="h-full w-full object-cover" />
                </span>
                <span>{botName} · Assistant</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-line p-3">
            <input
              type="text"
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-lg border border-line px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: widgetColor }}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </>
      )}

      <div className="flex items-center justify-between border-t border-line bg-canvas px-4 py-2">
        <p className="text-xs text-slate">Powered by SiteFlow</p>
        {escalationContact && (
          <a
            href={
              escalationContact.includes("@") ? `mailto:${escalationContact}` : escalationContact
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-slate hover:text-ink"
          >
            Talk to a human
          </a>
        )}
      </div>
    </div>
  );
}

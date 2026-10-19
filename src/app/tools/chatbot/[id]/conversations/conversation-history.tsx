"use client";

import { useEffect, useState } from "react";

type ConversationSummary = {
  id: string;
  started_at: string;
  last_message_at: string;
  message_count: number;
  preview: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConversationHistory({ botId }: { botId: string }) {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/bots/${botId}/conversations`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setConversations(data.conversations);
      })
      .catch(() => setError("Couldn't load conversations."));
  }, [botId]);

  async function toggleOpen(conversationId: string) {
    if (openId === conversationId) {
      setOpenId(null);
      setMessages(null);
      return;
    }
    setOpenId(conversationId);
    setMessages(null);
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/bots/${botId}/conversations/${conversationId}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  if (!conversations) {
    return <p className="text-sm text-slate">Loading…</p>;
  }

  if (conversations.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-white p-4 text-sm text-slate">
        No conversations yet — once your embedded widget is live and visitors
        start chatting, they&apos;ll show up here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {conversations.map((c) => (
        <div key={c.id} className="overflow-hidden rounded-xl border border-line bg-white">
          <button
            onClick={() => toggleOpen(c.id)}
            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-canvas"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{c.preview}</p>
              <p className="mt-1 text-xs text-slate">
                {c.message_count} messages · last active {formatDate(c.last_message_at)}
              </p>
            </div>
            <span className="shrink-0 text-xs text-slate">
              {openId === c.id ? "Hide" : "View"}
            </span>
          </button>

          {openId === c.id && (
            <div className="border-t border-line bg-canvas p-4">
              {messagesLoading && <p className="text-sm text-slate">Loading transcript…</p>}
              {!messagesLoading && messages && messages.length === 0 && (
                <p className="text-sm text-slate">No messages found.</p>
              )}
              {!messagesLoading && messages && (
                <div className="flex flex-col gap-2">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={
                        "max-w-[85%] rounded-2xl px-4 py-2 text-sm " +
                        (m.role === "user"
                          ? "self-end bg-brand text-white"
                          : "self-start bg-white text-ink")
                      }
                    >
                      {m.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

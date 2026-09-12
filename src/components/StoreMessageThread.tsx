"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

export interface ThreadMessage {
  id: string;
  senderRole: "admin" | "store";
  body: string;
  createdAt: string;
}

interface StoreMessageThreadProps {
  storeId: string;
  viewerRole: "admin" | "store";
  fetchMessages: () => Promise<ThreadMessage[]>;
  sendMessage: (body: string) => Promise<{ success: boolean; error?: string }>;
}

const POLL_INTERVAL_MS = 5000;

export function StoreMessageThread({
  storeId,
  viewerRole,
  fetchMessages,
  sendMessage,
}: StoreMessageThreadProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refs so the interval always calls the latest callbacks without resetting.
  const fetchRef = useRef(fetchMessages);
  const sendRef = useRef(sendMessage);

  useEffect(() => {
    fetchRef.current = fetchMessages;
  }, [fetchMessages]);

  useEffect(() => {
    sendRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await fetchRef.current();
        if (cancelled) return;
        setMessages(next);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load messages.");
        setLoading(false);
      }
    }

    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [storeId]);

  // Auto-scroll to the latest message whenever the thread updates.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await sendRef.current(body);
      if (!result.success) {
        setError(result.error || "Could not send the message.");
        return;
      }
      // Optimistic clear on success; the immediate refetch brings the row back.
      setDraft("");
      const next = await fetchRef.current();
      setMessages(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white">
      <div
        ref={scrollRef}
        className="flex max-h-80 min-h-48 flex-col gap-2 overflow-y-auto p-4"
      >
        {loading && messages.length === 0 ? (
          <p className="text-sm text-slate-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-500">
            No messages yet. Say hello to {viewerRole === "admin" ? "this store" : "the admin team"}.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.senderRole === viewerRole;
            return (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "self-end bg-emerald-600 text-white"
                    : "self-start bg-slate-100 text-slate-800"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <p
                  className={`mt-1 text-[11px] ${mine ? "text-emerald-100" : "text-slate-400"}`}
                >
                  {message.senderRole === "admin" ? "Admin" : "Store"} ·{" "}
                  {new Date(message.createdAt).toLocaleString()}
                </p>
              </div>
            );
          })
        )}
      </div>

      {error ? (
        <p className="border-t border-slate-100 px-4 pt-2 text-xs text-red-600">{error}</p>
      ) : null}

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-100 p-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

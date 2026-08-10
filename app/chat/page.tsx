// app/chat/page.tsx
// Chat constrained ke mastered vocab user (Fase 2) + riwayat sesi (Fase 3).
// Desain mengikuti stitch/chat_ai_ripen/code.html: AI bubble kiri (tertiary-ish
// surface), user bubble kanan (secondary-fixed) — lihat stitch/DESIGN.md bagian
// Components. Halaman lain (dashboard/review) tidak pakai sidenav Stitch, jadi di
// sini dibuat single-column mengikuti konvensi yang sudah ada di app/review/page.tsx.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatSessionMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface ChatSessionDetail extends ChatSessionMeta {
  messages: ChatMessage[];
}

const TOPIC_CHIPS = [
  "Ceritakan tentang harimu",
  "Apa hobi kamu?",
  "Bantu saya belajar kosakata makanan",
  "Latihan percakapan di restoran",
  "Cerita tentang keluarga saya",
];

function deriveTitle(text: string): string {
  const words = text.trim().split(/\s+/).slice(0, 8).join(" ");
  return words.length > 0 ? words : "Chat";
}

export default function ChatPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<ChatSessionMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Load session list on mount
  useEffect(() => {
    fetch("/api/chat/sessions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { sessions: ChatSessionMeta[] } | null) => {
        if (data) setSessions(data.sessions);
      })
      .catch(() => {});
  }, []);

  // Persist a message to the active session (fire-and-forget; failures surface
  // only via console to avoid blocking the chat UX).
  const persistMessage = useCallback(
    async (sessionId: string, msg: ChatMessage) => {
      try {
        const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: msg.role, content: msg.content }),
        });
        if (res.ok) {
          const data: { message: ChatMessage } = await res.json();
          // Attach the server id to the optimistic message (match by role+content,
          // since the object identity may have changed after re-render).
          setMessages((prev) =>
            prev.map((m) =>
              !m.id && m.role === msg.role && m.content === msg.content
                ? { ...m, id: data.message.id }
                : m
            )
          );
          setSessions((prev) =>
            prev.map((s) =>
              s.id === sessionId
                ? { ...s, messageCount: s.messageCount + 1, updatedAt: new Date().toISOString() }
                : s
            )
          );
        }
      } catch {
        // best-effort persistence
      }
    },
    [],
  );

  const loadSession = useCallback(async (id: string) => {
    setActiveId(id);
    setError(null);
    setDrawerOpen(false);
    try {
      const res = await fetch(`/api/chat/sessions/${id}`);
      if (!res.ok) return;
      const data: { session: ChatSessionDetail } = await res.json();
      setMessages(data.session.messages);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
    } catch {
      setError("Gagal memuat percakapan, coba lagi.");
    }
  }, []);

  const startNewChat = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setError(null);
    setDrawerOpen(false);
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
        if (!res.ok) return;
      } catch {
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeId === id) startNewChat();
    },
    [activeId, startNewChat],
  );

  const ensureSession = useCallback(async (title: string): Promise<string | null> => {
    if (activeId) return activeId;
    // Create session lazily; auto-title from first user message (8 words).
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "Chat" }),
    });
    if (!res.ok) return null;
    const data: { session: ChatSessionMeta } = await res.json();
    setSessions((prev) => [data.session, ...prev]);
    setActiveId(data.session.id);
    return data.session.id;
  }, [activeId]);

  const send = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || sending) return;

      const userMsg: ChatMessage = { role: "user", content };

      setInput("");
      setError(null);
      setMessages((m) => [...m, userMsg]);
      setSending(true);

      const sessionId = await ensureSession(deriveTitle(content));

      try {
        if (sessionId) persistMessage(sessionId, userMsg);

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content }),
        });

        if (res.status === 429) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? t("chat.quotaExceeded"));
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? t("chat.errorSend", { status: res.status }));
          return;
        }

        const data: { reply: string } = await res.json();
        const replyMsg: ChatMessage = { role: "assistant", content: data.reply };
        setMessages((m) => [...m, replyMsg]);
        if (sessionId) persistMessage(sessionId, replyMsg);
        requestAnimationFrame(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        });
      } catch {
        setError(t("chat.errorConnect"));
      } finally {
        setSending(false);
      }
    },
    [input, sending, ensureSession, persistMessage, t],
  );

  const selectChip = useCallback(
    (chip: string) => {
      startNewChat();
      setInput(chip);
      send(chip);
    },
    [startNewChat, send],
  );

  return (
    <main className="w-full max-w-[680px] flex flex-col mx-auto min-h-screen px-md py-lg md:py-xl">
      <header className="w-full flex items-center justify-between mb-lg">
        <div className="flex items-center gap-sm">
          <button
            aria-label="Toggle chat history"
            onClick={() => setDrawerOpen((v) => !v)}
            className="flex items-center justify-center p-sm rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant md:hidden"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <button
            aria-label="Back to Dashboard"
            onClick={() => router.push("/dashboard")}
            className="flex items-center justify-center p-sm rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
        </div>
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">forum</span>
          <h1 className="font-headline-md text-headline-md text-primary">{t("chat.title")}</h1>
        </div>
        <button
          aria-label={t("chat.newChat")}
          onClick={startNewChat}
          className="flex items-center justify-center p-sm rounded-full hover:bg-surface-variant transition-colors text-primary"
        >
          <span className="material-symbols-outlined text-[24px]">add_comment</span>
        </button>
      </header>

      {/* Session drawer (mobile: overlay; md+: inline sidebar) */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className="flex gap-md flex-1 min-h-0">
        <aside
          className={`fixed z-50 top-0 left-0 h-full w-[280px] bg-surface-container-low border-r border-unripe-pale p-md flex flex-col gap-sm transition-transform md:static md:z-auto md:translate-x-0 md:bg-transparent md:border-r-0 md:p-0 md:w-[220px] md:flex-shrink-0 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between mb-sm">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              {t("chat.chatHistory")}
            </span>
            <button
              aria-label={t("chat.newChat")}
              onClick={startNewChat}
              className="flex items-center gap-xs text-primary font-label-caps text-label-caps hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {t("chat.newChat")}
            </button>
          </div>

          {sessions.length === 0 && (
            <p className="font-body-md text-body-md text-on-surface-variant text-sm">
              {t("chat.noChats")}
            </p>
          )}

          <div className="flex flex-col gap-sm overflow-y-auto">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center gap-xs rounded-lg px-sm py-xs cursor-pointer transition-colors ${
                  activeId === s.id
                    ? "bg-primary-container text-on-primary-container"
                    : "hover:bg-surface-variant text-on-surface"
                }`}
                onClick={() => loadSession(s.id)}
              >
                <span className="material-symbols-outlined text-[18px] flex-shrink-0">chat</span>
              <span className="flex-1 truncate font-body-md text-body-md text-sm">{s.title}</span>
              <button
                aria-label={t("chat.deleteChat")}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(s.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-xs text-on-surface-variant hover:text-error"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat column (mobile: h-[calc(100dvh-120px)]; md+: grows beside sidebar) */}
      <div className="flex flex-col flex-1 min-h-0 md:h-auto">
        <div
          ref={listRef}
          className="h-[calc(100dvh-120px)] md:h-auto md:min-h-[50vh] flex-1 overflow-y-auto flex flex-col gap-md bg-surface-container-low rounded-xl border border-unripe-pale p-md mb-md"
        >
        {messages.length === 0 && (
          <div className="flex flex-col gap-md items-center my-auto text-center">
            <p className="font-body-md text-body-md text-on-surface-variant max-w-[420px]">
              {t("chat.emptyDesc")}
            </p>
            <div className="flex flex-col gap-sm">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                {t("chat.selectTopic")}
              </span>
              {TOPIC_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => selectChip(chip)}
                  className="px-md py-sm rounded-full border border-unripe-pale bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary transition-colors font-body-md text-body-md text-sm"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === "assistant" ? (
            <div key={i} className="flex gap-sm max-w-[85%]">
              <div className="w-9 h-9 rounded-full bg-surface-container-high border border-unripe-pale flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
              </div>
              <div className="bg-surface-container-lowest border border-unripe-pale rounded-2xl rounded-tl-none p-md shadow-sm">
                <p className="font-body-lg text-body-lg text-on-surface whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-sm max-w-[85%] self-end flex-row-reverse">
              <div className="w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center flex-shrink-0">
                <span className="font-label-caps text-label-caps">ME</span>
              </div>
              <div className="bg-secondary-fixed border border-secondary-fixed-dim rounded-2xl rounded-tr-none p-md shadow-sm">
                <p className="font-body-lg text-body-lg text-on-secondary-fixed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            </div>
          )
        )}

        {sending && (
          <div className="flex gap-sm max-w-[85%]">
            <div className="w-9 h-9 rounded-full bg-surface-container-high border border-unripe-pale flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
            </div>
            <div className="bg-surface-container-lowest border border-unripe-pale rounded-2xl rounded-tl-none p-md shadow-sm">
              <p className="font-body-md text-body-md text-on-surface-variant">{t("chat.typing")}</p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="font-body-md text-body-md text-error mb-sm">{error}</p>}

      <div className="relative flex items-end gap-sm bg-surface-container-lowest border border-outline-variant rounded-xl p-xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
        <textarea
          className="w-full bg-transparent border-none focus:ring-0 resize-none font-body-lg text-body-lg text-on-surface py-sm px-sm min-h-[44px] max-h-[120px]"
          placeholder={t("chat.inputPlaceholder")}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          onClick={() => send()}
          disabled={sending || !input.trim()}
          aria-label="Send"
          className="p-sm bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-colors flex-shrink-0 flex items-center justify-center h-10 w-10 disabled:opacity-40"
        >
          <span className="material-symbols-outlined">send</span>
        </button>
        </div>
      </div>
      </div>
    </main>
  );
}

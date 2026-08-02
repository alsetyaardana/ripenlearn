// app/chat/page.tsx
// Chat constrained ke mastered vocab user (Fase 2). Desain mengikuti
// stitch/chat_ai_ripen/code.html: AI bubble kiri (tertiary-ish surface), user bubble
// kanan (secondary-fixed) — lihat stitch/DESIGN.md bagian Components. Halaman lain
// (dashboard/review) tidak pakai sidenav Stitch, jadi di sini juga dibuat single-column
// mengikuti konvensi yang sudah ada di app/review/page.tsx.
"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Quota chat harian habis.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Gagal mengirim pesan (${res.status})`);
        return;
      }

      const data: { reply: string } = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch {
      setError("Gagal terhubung ke server, coba lagi.");
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  return (
    <main className="w-full max-w-[680px] flex flex-col mx-auto min-h-screen px-md py-lg md:py-xl">
      <header className="w-full flex items-center justify-between mb-lg">
        <button
          aria-label="Back to Dashboard"
          onClick={() => router.push("/dashboard")}
          className="flex items-center justify-center p-sm rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">forum</span>
          <h1 className="font-headline-md text-headline-md text-primary">Chat Practice</h1>
        </div>
        <div className="w-10" />
      </header>

      <div
        ref={listRef}
        className="flex-1 min-h-[50vh] overflow-y-auto flex flex-col gap-md bg-surface-container-low rounded-xl border border-unripe-pale p-md mb-md"
      >
        {messages.length === 0 && (
          <p className="font-body-md text-body-md text-on-surface-variant text-center my-auto">
            Mulai ngobrol pakai vocab yang sudah kamu kuasai. AI akan konsisten memakai
            kata-kata yang sudah mastered.
          </p>
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
              <p className="font-body-md text-body-md text-on-surface-variant">Mengetik...</p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="font-body-md text-body-md text-error mb-sm">{error}</p>}

      <div className="relative flex items-end gap-sm bg-surface-container-lowest border border-outline-variant rounded-xl p-xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
        <textarea
          className="w-full bg-transparent border-none focus:ring-0 resize-none font-body-lg text-body-lg text-on-surface py-sm px-sm min-h-[44px] max-h-[120px]"
          placeholder="Ketik dalam Pinyin atau Hanzi..."
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
          onClick={send}
          disabled={sending || !input.trim()}
          aria-label="Send"
          className="p-sm bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-colors flex-shrink-0 flex items-center justify-center h-10 w-10 disabled:opacity-40"
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </main>
  );
}

// app/review/page.tsx
// Sesi review FSRS — Card global (Fase 1). Desain mengikuti
// stitch/sesi_review_ripen/code.html + stitch/DESIGN.md, jangan menyimpang dari
// referensi itu tanpa alasan.
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { numToSymbolPinyin } from "@/lib/pinyin-format";
import { useTts } from "@/lib/use-tts";

interface ReviewCard {
  cardId: string;
  source: "hsk" | "chunk" | "custom";
  hanzi: string;
  pinyin: string;
  artiId: string;
  artiEn: string;
  partOfSpeech: string | null;
  exampleSentence: string | null;
  status: string;
  dueDate: string | null;
}

type Rating = "again" | "hard" | "good" | "easy";

const RATING_BUTTONS: { rating: Rating; label: string; interval: string; classes: string }[] = [
  { rating: "again", label: "Ulang", interval: "< 1m", classes: "bg-error-container text-on-error-container hover:border-again-red" },
  { rating: "hard", label: "Sulit", interval: "10m", classes: "bg-[#FDF0E1] text-hard-orange hover:border-hard-orange" },
  { rating: "good", label: "Bagus", interval: "1d", classes: "bg-secondary-fixed text-on-secondary-fixed hover:border-secondary" },
  { rating: "easy", label: "Mudah", interval: "4d", classes: "bg-primary-fixed text-on-primary-fixed hover:border-primary" },
];

export default function ReviewPage() {
  const router = useRouter();
  const { speak } = useTts();
  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const [total, setTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/review")
      .then((res) => {
        if (!res.ok) throw new Error(`Gagal memuat kartu review (${res.status})`);
        return res.json();
      })
      .then((data: { due: ReviewCard[]; new: ReviewCard[] }) => {
        const combined = [...data.due, ...data.new];
        setQueue(combined);
        setTotal(combined.length);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const current = queue[0];

  const lastPlayedRef = useRef<string | null>(null);
  useEffect(() => {
    if (flipped && current && lastPlayedRef.current !== current.hanzi) {
      lastPlayedRef.current = current.hanzi;
      speak(current.hanzi, "zh");
    }
  }, [flipped, current?.hanzi, speak]);

  const submitRating = useCallback(
    async (rating: Rating) => {
      if (!current || submitting) return;
      setSubmitting(true);
      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: current.cardId, source: current.source, rating }),
        });
        if (!res.ok) throw new Error(`Gagal menyimpan rating (${res.status})`);
        setQueue((q) => q.slice(1));
        setFlipped(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan rating");
      } finally {
        setSubmitting(false);
      }
    },
    [current, submitting]
  );

  if (loading) {
    return (
      <main className="w-full max-w-[680px] flex-1 flex items-center justify-center mx-auto min-h-screen">
        <p className="font-body-md text-body-md text-on-surface-variant">Memuat kartu...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="w-full max-w-[680px] flex-1 flex flex-col items-center justify-center gap-md mx-auto min-h-screen px-md text-center">
        <p className="font-body-md text-body-md text-error">{error}</p>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="w-full max-w-[680px] flex-1 flex flex-col items-center justify-center gap-md mx-auto min-h-screen px-md text-center">
        <span className="font-headline-md text-headline-md text-primary">Selesai untuk sekarang 🌱</span>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Tidak ada kartu due lagi. Kembali lagi nanti.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-primary hover:bg-primary-container text-on-primary px-lg py-md rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm"
        >
          Kembali ke Dashboard
        </button>
      </main>
    );
  }

  const doneCount = total - queue.length;

  return (
    <main className="w-full max-w-[680px] flex-1 flex flex-col px-md py-lg md:py-xl mx-auto min-h-screen">
      <header className="w-full flex justify-between items-center mb-xl">
        <button
          aria-label="Close Review"
          onClick={() => router.push("/dashboard")}
          className="flex items-center justify-center p-sm rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
        <div className="flex items-center gap-md">
          <div className="flex flex-col items-end">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Reviewing</span>
            <span className="font-body-md text-body-md font-medium text-primary">
              {doneCount + 1} / {total}
            </span>
          </div>
        </div>
      </header>

      <div className={`flex-1 flex flex-col justify-center perspective-1000 w-full mb-xl ${flipped ? "flashcard-flipped" : ""}`}>
        <div
          className="flashcard-container relative w-full min-h-[220px] max-h-[300px] sm:min-h-[300px] sm:max-h-[420px] transform-style-3d cursor-pointer"
          onClick={() => setFlipped((f) => !f)}
        >
          <div className="absolute inset-0 w-full h-full backface-hidden bg-surface-container-lowest border border-unripe-pale rounded-xl flex flex-col items-center justify-center p-lg paper-texture micro-shadow-active">
            <span className="font-headline-hanzi text-[40px] sm:text-[56px] md:text-[64px] text-primary tracking-widest">
              {current.hanzi}
            </span>
            <div className="absolute bottom-md text-center w-full">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase opacity-50">
                Tap to reveal
              </span>
            </div>
          </div>

          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-surface-container-lowest border border-unripe-pale rounded-xl paper-texture micro-shadow-active text-center">
            <div className="w-full h-full overflow-y-auto flex flex-col items-center justify-center p-lg">
              <span className="font-headline-md text-headline-md text-primary mb-xs">{current.hanzi}</span>
              <button
                aria-label="Play pronunciation"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(current.hanzi, "zh");
                }}
                className="absolute top-md right-md flex items-center justify-center p-sm rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[24px]">volume_up</span>
              </button>
              <span className="font-pinyin-ruby text-body-lg text-on-surface-variant mb-md">
                {current.pinyin ? numToSymbolPinyin(current.pinyin) : ""}
              </span>
              <div className="w-12 h-[1px] bg-outline-variant mb-md opacity-50" />
              <div className="flex flex-col items-center gap-xs mb-lg">
                <span className="font-body-lg text-body-lg text-primary font-medium">
                  {current.source === "chunk" || current.source === "custom"
                    ? current.artiId
                    : `${current.artiId} / ${current.artiEn}`}
                </span>
                {current.partOfSpeech && (
                  <span className="font-label-caps text-label-caps text-on-surface-variant bg-surface-container px-sm py-unit rounded uppercase">
                    {current.partOfSpeech}
                  </span>
                )}
              </div>
              {current.exampleSentence && (
                <div className="text-left w-full max-w-[80%] border-l-2 border-primary-fixed-dim pl-sm mt-sm">
                  <p className="font-body-md text-body-md text-on-surface">{current.exampleSentence}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`w-full flex justify-between gap-sm transition-opacity duration-300 ${
          flipped && !submitting ? "opacity-100" : "opacity-30 pointer-events-none"
        }`}
      >
        {RATING_BUTTONS.map((btn) => (
          <button
            key={btn.rating}
            onClick={() => submitRating(btn.rating)}
            className={`flex-1 flex flex-col items-center justify-center py-md rounded-lg transition-all border border-transparent hover:brightness-95 ${btn.classes}`}
          >
            <span className="font-label-caps text-label-caps uppercase mb-unit">{btn.label}</span>
            <span className="font-pinyin-ruby text-pinyin-ruby opacity-75">{btn.interval}</span>
          </button>
        ))}
      </div>
    </main>
  );
}

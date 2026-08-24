// app/tones/page.tsx
// Tone Recognition Quiz — latihan pengenalan nada Mandarin.
// User menebak nada (1-4/Netral) dari kartu yang sudah mastered.
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTts } from "@/lib/use-tts";
import { getToneColor, getToneLabel, getToneContour, getToneDescription } from "@/lib/tones";

interface QuizCard {
  cardId: string;
  pinyin: string;
  hanzi: string;
  artiId: string;
  tone: number;
}

interface AnswerResult {
  correct: boolean;
  correctTone: number;
  explanation: string;
}

const TONE_OPTIONS = [1, 2, 3, 4, 5] as const;

export default function TonesPage() {
  const { speak } = useTts();
  const [quizCards, setQuizCards] = useState<QuizCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTone, setSelectedTone] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  // Track kartu terakhir yang sudah di-TTS supaya tidak repeat
  const lastSpokenRef = useRef<string | null>(null);

  // Fetch quiz cards
  useEffect(() => {
    fetch("/api/tones/quiz")
      .then((res) => {
        if (!res.ok) throw new Error(`Gagal memuat quiz (${res.status})`);
        return res.json();
      })
      .then((data: QuizCard[]) => {
        setQuizCards(data);
        if (data.length === 0) setError("empty");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const current = quizCards[currentIndex];

  // TTS otomatis saat kartu baru muncul
  useEffect(() => {
    if (current && !showResult && lastSpokenRef.current !== current.cardId) {
      lastSpokenRef.current = current.cardId;
      speak(current.hanzi, "zh");
    }
  }, [current, showResult, speak]);

  // Submit jawaban
  const submitAnswer = useCallback(
    async (tone: number) => {
      if (!current || submitting || showResult) return;
      setSelectedTone(tone);
      setSubmitting(true);
      try {
        const res = await fetch("/api/tones/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: current.cardId, selectedTone: tone }),
        });
        if (!res.ok) throw new Error("Gagal mengirim jawaban");
        const result: AnswerResult = await res.json();
        setAnswerResult(result);
        setShowResult(true);
        if (result.correct) {
          setScore((s) => s + 1);
          setStreak((s) => s + 1);
        } else {
          setStreak(0);
        }
      } catch {
        setError("Gagal mengirim jawaban. Coba lagi.");
      } finally {
        setSubmitting(false);
      }
    },
    [current, submitting, showResult]
  );

  // Lanjut ke soal berikutnya
  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 >= quizCards.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedTone(null);
      setShowResult(false);
      setAnswerResult(null);
    }
  }, [currentIndex, quizCards.length]);

  // Restart quiz
  const restart = useCallback(() => {
    setLoading(true);
    setError(null);
    setFinished(false);
    setCurrentIndex(0);
    setSelectedTone(null);
    setShowResult(false);
    setAnswerResult(null);
    setScore(0);
    setStreak(0);
    lastSpokenRef.current = null;
    fetch("/api/tones/quiz")
      .then((res) => res.json())
      .then((data: QuizCard[]) => {
        setQuizCards(data);
        if (data.length === 0) setError("empty");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <main className="max-w-container-max mx-auto px-sm md:px-lg py-lg">
        <div className="max-w-lg mx-auto space-y-lg">
          <div className="h-8 w-48 bg-surface-container rounded-lg animate-pulse" />
          <div className="h-64 bg-surface-container rounded-xl animate-pulse" />
          <div className="grid grid-cols-5 gap-sm">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-surface-container rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ── Empty state ──
  if (error === "empty" || quizCards.length === 0) {
    return (
      <main className="max-w-container-max mx-auto px-sm md:px-lg py-lg">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-lg text-center">
          <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[40px] text-on-primary-container">
              record_voice_over
            </span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-sm">
              Tone Quiz
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">
              Belum ada kartu untuk quiz. Selesaikan beberapa review dulu supaya kartu
              muncul di sini.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── Error state ──
  if (error && error !== "empty") {
    return (
      <main className="max-w-container-max mx-auto px-sm md:px-lg py-lg">
        <div className="max-w-lg mx-auto text-center py-xl">
          <p className="text-error font-body-md mb-md">{error}</p>
          <button
            onClick={restart}
            className="bg-primary text-on-primary font-body-md font-semibold px-lg py-sm rounded-lg"
          >
            Coba Lagi
          </button>
        </div>
      </main>
    );
  }

  // ── Ringkasan skor akhir ──
  if (finished) {
    const total = quizCards.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <main className="max-w-container-max mx-auto px-sm md:px-lg py-lg">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-lg text-center py-xl">
          <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-on-primary-container">
              emoji_events
            </span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-sm">
              Quiz Selesai!
            </h1>
            <p className="font-display-md text-[48px] text-primary mb-sm">{pct}%</p>
            <p className="font-body-lg text-on-surface-variant">
              {score} dari {total} benar
            </p>
          </div>

          <button
            onClick={restart}
            className="bg-primary text-on-primary font-body-md font-semibold px-xl py-md rounded-lg shadow-[0_8px_24px_-8px_rgba(22,52,34,0.4)] hover:translate-y-[-2px] transition-all flex items-center justify-center gap-sm"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
            Main Lagi
          </button>
        </div>
      </main>
    );
  }

  // ── Quiz UI ──
  return (
    <main className="max-w-container-max mx-auto px-sm md:px-lg py-lg">
      <div className="max-w-lg mx-auto space-y-lg">
        {/* Header: progress + skor */}
        <div className="flex items-center justify-between">
          <span className="font-label-md text-label-md text-on-surface-variant">
            {currentIndex + 1} / {quizCards.length}
          </span>
          <div className="flex items-center gap-md">
            {streak >= 2 && (
              <span className="font-label-md text-label-md text-primary flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                {streak}
              </span>
            )}
            <span className="font-label-md text-label-md text-on-surface-variant">
              Skor: {score}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / quizCards.length) * 100}%` }}
          />
        </div>

        {/* Kartu soal */}
        <div className="bg-surface rounded-xl p-xl border border-outline-variant text-center space-y-md">
          <p className="font-headline-hanzi text-headline-hanzi text-on-surface">
            {current.hanzi}
          </p>
          <p className="font-body-lg text-on-surface-variant">{current.artiId}</p>
          <button
            onClick={() => speak(current.hanzi, "zh")}
            className="inline-flex items-center gap-xs text-primary hover:text-primary/80 transition-colors"
            aria-label="Dengarkan pengucapan"
          >
            <span className="material-symbols-outlined text-[20px]">volume_up</span>
            <span className="font-label-sm text-label-sm">Dengarkan</span>
          </button>
        </div>

        {/* Tombol nada */}
        <div className="grid grid-cols-5 gap-sm">
          {TONE_OPTIONS.map((tone) => {
            const isSelected = selectedTone === tone;
            const isCorrectTone = showResult && answerResult?.correctTone === tone;
            const isWrong = showResult && isSelected && !answerResult?.correct;
            const color = getToneColor(tone);

            let btnClass = "border-2 transition-all duration-200 ";
            if (showResult) {
              if (isCorrectTone) {
                btnClass += "border-primary bg-primary-container ";
              } else if (isWrong) {
                btnClass += "border-error bg-error-container ";
              } else {
                btnClass += "border-outline-variant bg-surface-container-low opacity-50 ";
              }
            } else {
              btnClass += "border-outline-variant hover:border-current active:scale-95 ";
              if (submitting) btnClass += "opacity-50 cursor-not-allowed ";
            }

            return (
              <button
                key={tone}
                onClick={() => submitAnswer(tone)}
                disabled={showResult || submitting}
                className={`${btnClass} rounded-xl py-md px-sm flex flex-col items-center gap-xs`}
                style={!showResult ? { color } : undefined}
              >
                <svg viewBox="0 0 60 24" className="w-12 h-5" fill="none" strokeWidth="3" strokeLinecap="round" stroke={showResult ? (isCorrectTone ? "#16a34a" : isWrong ? "#dc2626" : "#9ca3af") : color}>
                  <path d={getToneContour(tone)} />
                </svg>
                <span className="font-label-md text-label-md text-on-surface">
                  {tone === 5 ? "Netral" : `Nada ${tone}`}
                </span>
                <span className="font-body-xs text-on-surface-variant">
                  {getToneDescription(tone)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {showResult && answerResult && (
          <div
            className={`rounded-xl p-md border ${
              answerResult.correct
                ? "bg-primary-container border-primary"
                : "bg-error-container border-error"
            }`}
          >
            <div className="flex items-start gap-sm">
              <span className="material-symbols-outlined text-[20px] mt-0.5">
                {answerResult.correct ? "check_circle" : "cancel"}
              </span>
              <div>
                <p className="font-body-md text-on-surface font-medium">
                  {answerResult.correct ? "Benar!" : "Salah"}
                </p>
                <p className="font-body-sm text-on-surface-variant mt-xs">
                  {answerResult.explanation}
                </p>
                {!answerResult.correct && (
                  <p className="font-body-sm text-on-surface-variant mt-xs">
                    Pinyin: <span className="font-medium">{current.pinyin}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={nextQuestion}
              className="mt-md w-full bg-primary text-on-primary font-body-md font-semibold py-sm rounded-lg hover:translate-y-[-1px] transition-all flex items-center justify-center gap-xs"
            >
              {currentIndex + 1 >= quizCards.length ? "Lihat Hasil" : "Soal Berikutnya"}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

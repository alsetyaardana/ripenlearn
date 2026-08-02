// app/reading/page.tsx
// Latihan baca — paragraf dari vocab mastered only + comprehension check. Tidak ada
// prompt Stitch khusus untuk reading; layout dibuat konsisten dengan visual language
// halaman lain (spacing/token dari tailwind.config.js), lebar dibatasi 680px sesuai
// "reading width" di stitch/DESIGN.md.
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface ComprehensionQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface ReadingPassage {
  passage: string;
  translation: string;
  questions: ComprehensionQuestion[];
  vocabWarning: boolean;
}

export default function ReadingPage() {
  const router = useRouter();
  const [reading, setReading] = useState<ReadingPassage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAnswers({});
    setChecked(false);
    try {
      const res = await fetch("/api/reading", { method: "POST" });
      if (res.status === 429) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Quota reading harian habis.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Gagal membuat latihan baca (${res.status})`);
        return;
      }
      const data: ReadingPassage = await res.json();
      setReading(data);
    } catch {
      setError("Gagal terhubung ke server, coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

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
          <span className="material-symbols-outlined text-primary">menu_book</span>
          <h1 className="font-headline-md text-headline-md text-primary">Latihan Baca</h1>
        </div>
        <div className="w-10" />
      </header>

      {error && <p className="font-body-md text-body-md text-error mb-md">{error}</p>}

      {!reading && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-md text-center py-xl">
          <p className="font-body-md text-body-md text-on-surface-variant max-w-[480px]">
            Buat paragraf latihan baca dari vocab yang sudah kamu kuasai.
          </p>
          <button
            onClick={generate}
            className="bg-primary hover:bg-primary-container text-on-primary px-lg py-md rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm"
          >
            Buat Latihan Baca
          </button>
        </div>
      )}

      {loading && (
        <p className="font-body-md text-body-md text-on-surface-variant text-center py-xl">
          Membuat paragraf...
        </p>
      )}

      {reading && (
        <>
          {reading.vocabWarning && (
            <div className="bg-error-container text-on-error-container rounded-lg p-sm mb-md font-body-md text-body-md">
              Beberapa kata di paragraf ini mungkin di luar vocab yang sudah kamu kuasai —
              anggap sebagai bonus exposure, bukan materi wajib.
            </div>
          )}

          <article className="bg-surface-container-lowest rounded-xl p-lg mb-md shadow-sm border border-unripe-pale">
            <div className="flex justify-between items-center mb-md">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Passage
              </span>
              <button
                onClick={() => setShowTranslation((v) => !v)}
                className="font-label-caps text-label-caps text-secondary hover:text-primary transition-colors"
              >
                {showTranslation ? "Sembunyikan Terjemahan" : "Tampilkan Terjemahan"}
              </button>
            </div>
            <p className="font-body-lg text-body-lg text-on-surface leading-loose whitespace-pre-wrap">
              {reading.passage}
            </p>
            {showTranslation && (
              <p className="font-body-md text-body-md text-on-surface-variant mt-md pt-md border-t border-outline-variant whitespace-pre-wrap">
                {reading.translation}
              </p>
            )}
          </article>

          {reading.questions.length > 0 && (
            <div className="bg-surface-container rounded-xl p-lg mb-md border border-outline-variant/30">
              <h3 className="font-headline-md text-headline-md text-primary mb-md">
                Comprehension Check
              </h3>
              <div className="flex flex-col gap-lg">
                {reading.questions.map((q, qi) => (
                  <div key={qi}>
                    <p className="font-body-md text-body-md text-on-surface mb-sm">{q.question}</p>
                    <div className="flex flex-col gap-sm">
                      {q.options.map((opt, oi) => {
                        const selected = answers[qi] === oi;
                        const isCorrect = oi === q.correctIndex;
                        const showResult = checked;
                        return (
                          <button
                            key={oi}
                            onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                            className={`text-left px-md py-sm rounded-lg border transition-colors font-body-md text-body-md ${
                              showResult && isCorrect
                                ? "border-good-green bg-secondary-fixed text-on-secondary-fixed"
                                : showResult && selected && !isCorrect
                                  ? "border-again-red bg-error-container text-on-error-container"
                                  : selected
                                    ? "border-primary bg-surface-container-lowest"
                                    : "border-unripe-pale bg-surface-container-lowest hover:border-primary"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setChecked(true)}
                disabled={Object.keys(answers).length < reading.questions.length}
                className="mt-lg bg-primary hover:bg-primary-container text-on-primary px-lg py-sm rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm disabled:opacity-40"
              >
                Cek Jawaban
              </button>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={generate}
              className="flex items-center gap-xs text-primary font-medium px-lg py-sm rounded-lg border border-primary hover:bg-primary-fixed transition-colors font-body-md text-body-md"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Generate Paragraf Baru
            </button>
          </div>
        </>
      )}
    </main>
  );
}

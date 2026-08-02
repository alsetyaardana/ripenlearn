// app/exam/page.tsx
// Simulasi ujian — soal pilihan ganda dari vocab mastered only. Desain mengikuti
// bagian "Exam View" di stitch/latihan_ujian_ripen/code.html (progress header, kartu
// soal, tombol opsi 2 kolom) — disederhanakan jadi single-column konsisten dengan
// app/review/page.tsx dan app/reading/page.tsx.
"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface ExamQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface ExamSet {
  questions: ExamQuestion[];
  vocabWarning: boolean;
}

export default function ExamPage() {
  const router = useRouter();
  const [exam, setExam] = useState<ExamSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    try {
      const res = await fetch("/api/exam", { method: "POST" });
      if (res.status === 429) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Quota exam harian habis.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Gagal membuat soal ujian (${res.status})`);
        return;
      }
      const data: ExamSet = await res.json();
      setExam(data);
    } catch {
      setError("Gagal terhubung ke server, coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  const current = exam?.questions[index];
  const total = exam?.questions.length ?? 0;
  const progressPct = useMemo(() => (total ? ((index + 1) / total) * 100 : 0), [index, total]);

  const pickOption = (oi: number) => {
    if (selected !== null || !current) return;
    setSelected(oi);
    if (oi === current.correctIndex) setScore((s) => s + 1);
  };

  const next = () => {
    if (!exam) return;
    if (index + 1 >= exam.questions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  };

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
          <span className="material-symbols-outlined text-primary">quiz</span>
          <h1 className="font-headline-md text-headline-md text-primary">Simulasi Ujian</h1>
        </div>
        <div className="w-10" />
      </header>

      {error && <p className="font-body-md text-body-md text-error mb-md">{error}</p>}

      {!exam && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-md text-center py-xl">
          <p className="font-body-md text-body-md text-on-surface-variant max-w-[480px]">
            Buat set soal simulasi ujian dari vocab yang sudah kamu kuasai.
          </p>
          <button
            onClick={generate}
            className="bg-primary hover:bg-primary-container text-on-primary px-lg py-md rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm"
          >
            Mulai Simulasi Ujian
          </button>
        </div>
      )}

      {loading && (
        <p className="font-body-md text-body-md text-on-surface-variant text-center py-xl">
          Membuat soal...
        </p>
      )}

      {exam && exam.vocabWarning && !finished && (
        <div className="bg-error-container text-on-error-container rounded-lg p-sm mb-md font-body-md text-body-md">
          Beberapa soal mungkin memakai kata di luar vocab yang sudah kamu kuasai.
        </div>
      )}

      {exam && !finished && current && (
        <>
          <div className="flex justify-between items-center mb-sm">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              Soal {index + 1} / {total}
            </span>
          </div>
          <div className="w-full bg-surface-container h-2 rounded-full mb-lg overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-lg mb-md shadow-sm border border-unripe-pale">
            <p className="font-headline-md text-headline-md text-on-background mb-lg">
              {current.question}
            </p>
            <div className="grid grid-cols-1 gap-sm">
              {current.options.map((opt, oi) => {
                const isCorrect = oi === current.correctIndex;
                const isSelected = selected === oi;
                const showResult = selected !== null;
                return (
                  <button
                    key={oi}
                    onClick={() => pickOption(oi)}
                    className={`text-left px-md py-md rounded-lg border-2 transition-colors font-body-md text-body-md flex items-center justify-between ${
                      showResult && isCorrect
                        ? "border-good-green bg-secondary-fixed text-on-secondary-fixed"
                        : showResult && isSelected && !isCorrect
                          ? "border-again-red bg-error-container text-on-error-container"
                          : "border-surface-container bg-surface hover:border-primary"
                    }`}
                  >
                    <span>{opt}</span>
                    {showResult && isCorrect && (
                      <span className="material-symbols-outlined text-good-green">check_circle</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={next}
              disabled={selected === null}
              className="bg-primary text-on-primary font-medium px-lg py-md rounded-lg hover:bg-primary-container transition-colors shadow-sm disabled:opacity-40"
            >
              {index + 1 >= total ? "Selesai" : "Soal Berikutnya"}
            </button>
          </div>
        </>
      )}

      {exam && finished && (
        <div className="flex-1 flex flex-col items-center justify-center gap-md text-center py-xl">
          <span className="font-headline-md text-headline-md text-primary">
            Skor: {score} / {total}
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Simulasi ujian selesai. Jawaban belum mempengaruhi jadwal review kartu (fitur ini
            menyusul).
          </p>
          <button
            onClick={generate}
            className="bg-primary hover:bg-primary-container text-on-primary px-lg py-md rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm"
          >
            Ulangi Simulasi
          </button>
        </div>
      )}
    </main>
  );
}

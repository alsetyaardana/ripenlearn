// app/exam/page.tsx
// Simulasi ujian — soal pilihan ganda dari vocab mastered only. Desain mengikuti
// bagian "Exam View" di stitch/latihan_ujian_ripen/code.html (progress header, kartu
// soal, tombol opsi 2 kolom) — disederhanakan jadi single-column konsisten dengan
// app/review/page.tsx dan app/reading/page.tsx.
//
// Jawaban di-submit ke server setelah selesai; correctIndex TIDAK pernah dikirim ke client.
"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface ClientQuestion {
  question: string;
  options: string[];
}

interface ExamResult {
  correct: boolean;
  correctIndex: number;
}

export default function ExamPage() {
  const router = useRouter();
  const [examId, setExamId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [vocabWarning, setVocabWarning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [results, setResults] = useState<ExamResult[] | null>(null);
  const [finished, setFinished] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExamId(null);
    setQuestions([]);
    setVocabWarning(false);
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setResults(null);
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
      const data = await res.json();
      setExamId(data.examId);
      setQuestions(data.questions);
      setVocabWarning(data.vocabWarning ?? false);
    } catch {
      setError("Gagal terhubung ke server, coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  const total = questions.length;
  const progressPct = useMemo(() => (total ? ((index + 1) / total) * 100 : 0), [index, total]);

  const pickOption = (oi: number) => {
    if (selected !== null) return;
    setSelected(oi);
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = oi;
      return next;
    });
  };

  const next = async () => {
    if (index + 1 >= total) {
      // Soal terakhir — submit jawaban ke server
      await submitExam();
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  };

  const submitExam = async () => {
    if (!examId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, answers }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Gagal submit jawaban (${res.status})`);
        return;
      }
      const data = await res.json();
      setResults(data.results);
      setFinished(true);
    } catch {
      setError("Gagal terhubung ke server, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const score = results?.filter((r) => r.correct).length ?? 0;
  const current = questions[index];
  const currentResult = results?.[index];

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

      {!examId && !loading && (
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

      {submitting && (
        <p className="font-body-md text-body-md text-on-surface-variant text-center py-xl">
          Memeriksa jawaban...
        </p>
      )}

      {examId && vocabWarning && !finished && (
        <div className="bg-error-container text-on-error-container rounded-lg p-sm mb-md font-body-md text-body-md">
          Beberapa soal mungkin memakai kata di luar vocab yang sudah kamu kuasai.
        </div>
      )}

      {examId && !finished && !submitting && current && (
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
                const isSelected = selected === oi;
                const showResult = selected !== null;
                return (
                  <button
                    key={oi}
                    onClick={() => pickOption(oi)}
                    className={`text-left px-md py-md rounded-lg border-2 transition-colors font-body-md text-body-md flex items-center justify-between ${
                      showResult && isSelected
                        ? "border-primary bg-primary-container text-on-primary-container"
                        : "border-surface-container bg-surface hover:border-primary"
                    }`}
                  >
                    <span>{opt}</span>
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

      {finished && results && (
        <div className="flex-1 flex flex-col items-center justify-center gap-md text-center py-xl">
          <span className="font-headline-md text-headline-md text-primary">
            Skor: {score} / {total}
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Simulasi ujian selesai. Jawaban belum mempengaruhi jadwal review kartu (fitur ini
            menyusul).
          </p>

          {/* Ringkasan jawaban */}
          <div className="w-full text-left mt-md">
            {questions.map((q, qi) => {
              const r = results[qi];
              return (
                <div key={qi} className="mb-md bg-surface-container-lowest rounded-lg p-md border border-unripe-pale">
                  <p className="font-body-md text-body-md text-on-background mb-sm">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="flex flex-col gap-xs">
                    {q.options.map((opt, oi) => {
                      const isCorrectAnswer = oi === r.correctIndex;
                      const wasSelected = answers[qi] === oi;
                      return (
                        <span
                          key={oi}
                          className={`font-body-sm text-body-sm px-sm py-xs rounded ${
                            isCorrectAnswer
                              ? "bg-secondary-fixed text-on-secondary-fixed font-medium"
                              : wasSelected && !r.correct
                                ? "bg-error-container text-on-error-container"
                                : "text-on-surface-variant"
                          }`}
                        >
                          {opt}
                          {isCorrectAnswer && " ✓"}
                          {wasSelected && !r.correct && " ✗"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={generate}
            className="bg-primary hover:bg-primary-container text-on-primary px-lg py-md rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm mt-md"
          >
            Ulangi Simulasi
          </button>
        </div>
      )}
    </main>
  );
}

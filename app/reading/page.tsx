// app/reading/page.tsx
// Latihan baca — paragraf dari vocab mastered only + comprehension check. Tidak ada
// prompt Stitch khusus untuk reading; layout dibuat konsisten dengan visual language
// halaman lain (spacing/token dari tailwind.config.js), lebar dibatasi 680px sesuai
// "reading width" di stitch/DESIGN.md.
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { numToSymbolPinyin } from "@/lib/pinyin-format";

interface ComprehensionQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface AnnotatedToken {
  hanzi: string;
  pinyin: string;
  tone: number;
}

interface ReadingPassage {
  passage: string;
  translation: string;
  questions: ComprehensionQuestion[];
  vocabWarning: boolean;
  tokens: AnnotatedToken[];
}

interface ReadingHistoryMeta {
  id: string;
  topic: string | null;
  preview: string;
  createdAt: string;
}

interface ReadingHistoryDetail extends ReadingPassage {
  topic: string | null;
  createdAt: string;
}

const PRESET_TOPICS = [
  "Kehidupan sehari-hari",
  "Kuliner",
  "Perjalanan",
  "Keluarga",
  "Pekerjaan",
  "Cuaca",
];

export default function ReadingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [reading, setReading] = useState<ReadingPassage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showPinyin, setShowPinyin] = useState(false);
  const [topic, setTopic] = useState("");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [history, setHistory] = useState<ReadingHistoryMeta[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load history list on mount
  useEffect(() => {
    fetch("/api/reading/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { sessions: ReadingHistoryMeta[] } | null) => {
        if (data) setHistory(data.sessions);
      })
      .catch(() => {});
  }, []);

  const generate = useCallback(
    async (overrideTopic?: string) => {
      setLoading(true);
      setError(null);
      setAnswers({});
      setChecked(false);
      try {
        const res = await fetch("/api/reading", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: overrideTopic ?? topic }),
        });
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
    },
    [topic],
  );

  const loadHistory = useCallback(async () => {
    setHistoryOpen(true);
    setLoadingHistory(true);
    setError(null);
    try {
      const res = await fetch("/api/reading/history");
      if (!res.ok) {
        setError("Gagal memuat riwayat baca.");
        return;
      }
      const data: { sessions: ReadingHistoryMeta[] } = await res.json();
      setHistory(data.sessions);
    } catch {
      setError("Gagal memuat riwayat baca.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const openHistorySession = useCallback(async (id: string) => {
    setHistoryOpen(false);
    setLoading(true);
    setError(null);
    setAnswers({});
    setChecked(false);
    try {
      const res = await fetch(`/api/reading/history/${id}`);
      if (!res.ok) {
        setError("Gagal memuat latihan baca tersimpan.");
        return;
      }
      const data: { session: ReadingHistoryDetail } = await res.json();
      setReading({
        passage: data.session.passage,
        translation: data.session.translation,
        questions: data.session.questions,
        vocabWarning: false,
        tokens: data.session.tokens ?? [],
      });
    } catch {
      setError("Gagal memuat latihan baca tersimpan.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <main className="w-full max-w-[900px] flex flex-col mx-auto min-h-screen px-md py-lg md:py-xl">
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
          <h1 className="font-headline-md text-headline-md text-primary">{t("reading.title")}</h1>
        </div>
        <button
          aria-label={t("reading.history")}
          onClick={loadHistory}
          className="flex items-center justify-center p-sm rounded-full hover:bg-surface-variant transition-colors text-primary"
        >
          <span className="material-symbols-outlined text-[24px]">history</span>
        </button>
      </header>

      {/* History drawer */}
      {historyOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setHistoryOpen(false)}
          />
          <aside className="fixed z-50 top-0 right-0 h-full w-[300px] bg-surface-container-low border-l border-unripe-pale p-md flex flex-col gap-sm shadow-xl">
            <div className="flex items-center justify-between mb-sm">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                {t("reading.history")}
              </span>
              <button
                aria-label="Close history"
                onClick={() => setHistoryOpen(false)}
                className="flex items-center justify-center p-xs rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {loadingHistory && (
              <p className="font-body-md text-body-md text-on-surface-variant">
                {t("reading.loading")}
              </p>
            )}

            {!loadingHistory && history.length === 0 && (
              <p className="font-body-md text-body-md text-on-surface-variant">
                {t("reading.historyEmpty")}
              </p>
            )}

            <div className="flex flex-col gap-sm overflow-y-auto">
              {history.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openHistorySession(s.id)}
                  className="flex flex-col gap-xs rounded-lg px-sm py-sm text-left transition-colors hover:bg-surface-variant text-on-surface border border-unripe-pale bg-surface-container-lowest"
                >
                  <span className="font-body-md text-body-md text-sm truncate">
                    {s.topic || s.preview}
                  </span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant text-xs">
                    {new Date(s.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </>
      )}

      {error && <p className="font-body-md text-body-md text-error mb-md">{error}</p>}

      {!reading && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-md text-center py-xl">
          <p className="font-body-md text-body-md text-on-surface-variant max-w-[480px]">
            {t("reading.emptyDesc")}
          </p>

          <div className="w-full max-w-[480px] flex flex-col gap-md text-left">
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant block mb-xs">
                {t("reading.topic")}
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t("reading.topicPlaceholder")}
                className="w-full px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md"
              />
              <div className="flex flex-wrap gap-sm mt-sm">
                {PRESET_TOPICS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setTopic(preset);
                    }}
                    className={`px-md py-xs rounded-full border font-body-md text-body-md transition-colors ${
                      topic === preset
                        ? "border-primary bg-primary-container text-on-primary-container"
                        : "border-unripe-pale bg-surface-container-lowest hover:border-primary text-on-surface-variant"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => generate()}
              className="bg-primary hover:bg-primary-container text-on-primary px-lg py-md rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm"
            >
              {t("reading.generate")}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <p className="font-body-md text-body-md text-on-surface-variant text-center py-xl">
          {t("reading.loading")}
        </p>
      )}

      {reading && (
        <>
          {reading.vocabWarning && (
            <div className="bg-error-container text-on-error-container rounded-lg p-sm mb-md font-body-md text-body-md">
              {t("reading.vocabWarning")}
            </div>
          )}

          <article className="bg-surface-container-lowest rounded-xl p-lg mb-md shadow-sm border border-unripe-pale">
            <div className="flex justify-between items-center mb-md gap-sm flex-wrap">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                {t("reading.passage")}
              </span>
              <div className="flex items-center gap-md">
                <label className="flex items-center gap-xs cursor-pointer font-label-caps text-label-caps text-secondary">
                  <input
                    type="checkbox"
                    checked={showPinyin}
                    onChange={(e) => setShowPinyin(e.target.checked)}
                    className="accent-primary"
                  />
                  {t("reading.showPinyin")}
                </label>
                <label className="flex items-center gap-xs cursor-pointer font-label-caps text-label-caps text-secondary">
                  <input
                    type="checkbox"
                    checked={showTranslation}
                    onChange={(e) => setShowTranslation(e.target.checked)}
                    className="accent-primary"
                  />
                  {t("reading.showTranslation")}
                </label>
              </div>
            </div>
            <p className="font-body-lg text-body-lg text-on-surface leading-loose whitespace-pre-wrap">
              {showPinyin && reading.tokens ? (
                <span className="pinyin-ruby">
                  {reading.tokens.map((token, ti) =>
                    token.pinyin ? (
                      <ruby key={ti} className="pinyin-ruby-item">
                        {token.hanzi}
                        <rt className="text-[1em]">{token.pinyin ? numToSymbolPinyin(token.pinyin) : ""}</rt>
                      </ruby>
                    ) : (
                      <span key={ti}>{token.hanzi}</span>
                    ),
                  )}
                </span>
              ) : (
                reading.passage
              )}
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
                {t("reading.comprehensionCheck")}
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
                {t("reading.checkAnswers")}
              </button>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => generate()}
              className="flex items-center gap-xs text-primary font-medium px-lg py-sm rounded-lg border border-primary hover:bg-primary-fixed transition-colors font-body-md text-body-md"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              {t("reading.generateNew")}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

// app/onboarding/page.tsx
// Onboarding belajar saat user pertama login. Beginner-friendly, mobile-first.
// User memilih: target HSK (atau lewati), target tanggal (opsional),
// dan kartu baru per hari (default 20). Submit -> PUT /api/settings
// -> redirect ke /dashboard.
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";

const HSK_LEVELS = [
  { level: 1, idDesc: "Pemula — 300 kata", enDesc: "Beginner — 300 words" },
  { level: 2, idDesc: "Dasar — 498 kata", enDesc: "Elementary — 498 words" },
  { level: 3, idDesc: "Dasar lanjutan — 997 kata", enDesc: "Pre-Intermediate — 997 words" },
  { level: 4, idDesc: "Menengah — 2.592 kata", enDesc: "Intermediate — 2,592 words" },
  { level: 5, idDesc: "Menengah lanjutan — 4.377 kata", enDesc: "Upper-Intermediate — 4,377 words" },
  { level: 6, idDesc: "Advanced — 6.162 kata", enDesc: "Advanced — 6,162 words" },
  { level: 7, idDesc: "Mastery — 10.959 kata (termasuk HSK 7, 8, 9)", enDesc: "Mastery — 10,959 words (includes HSK 7, 8, 9)" },
];

const NEW_CARD_PRESETS = [5, 10, 20, 30];

export default function OnboardingPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [targetHskLevel, setTargetHskLevel] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [newCardsPerDay, setNewCardsPerDay] = useState(20);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  const submit = useCallback(async () => {
    if (submitting) return;
    if (!privacyChecked) {
      setError(t("onboarding.privacyRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { newCardsPerDay };
      payload.targetHskLevel = targetHskLevel;
      payload.targetDate = targetDate || null;

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? t("settings.errorSave"));
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("settings.errorSaveRetry"));
    } finally {
      setSubmitting(false);
    }
  }, [targetHskLevel, targetDate, newCardsPerDay, submitting, router, privacyChecked, t]);

  const hskOptions = HSK_LEVELS.map((o) => ({
    level: o.level,
    label: `HSK ${o.level}`,
    desc: language === "en" ? o.enDesc : o.idDesc,
  }));

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-md py-xl">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center text-center mb-xl">
          <span className="text-[40px] mb-sm">🌱</span>
          <h1 className="font-display-lg text-display-lg text-primary">{t("onboarding.welcome")}</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mt-sm">
            {t("onboarding.welcomeDesc")}
          </p>
        </div>

        <section className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale mb-md">
          <h2 className="font-headline-md text-headline-md text-primary mb-xs">{t("onboarding.targetHSK")}</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-md">
            {t("onboarding.targetHSKDesc")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            {hskOptions.map((opt) => {
              const selected = targetHskLevel === opt.level;
              return (
                <button
                  key={opt.level}
                  type="button"
                  onClick={() => setTargetHskLevel(opt.level)}
                  className={`text-left px-md py-sm rounded-lg border transition-all ${
                    selected
                      ? "border-primary bg-primary-container text-on-primary-container"
                      : "border-outline-variant bg-surface-container-lowest hover:border-primary text-on-surface"
                  }`}
                >
                  <span className="font-headline-md text-headline-md block">{opt.label}</span>
                  <span className="font-body-md text-body-md text-on-surface-variant block">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale mb-md">
          <h2 className="font-headline-md text-headline-md text-primary mb-xs">{t("onboarding.targetDate")}</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-md">
            {t("onboarding.targetDateDesc")}
          </p>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full sm:w-auto px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md"
          />
        </section>

        <section className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale mb-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-xs">
            {t("onboarding.newCardsPerDay")}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-md">
            {t("onboarding.newCardsDesc")}
          </p>
          <div className="flex flex-wrap gap-sm mb-sm">
            {NEW_CARD_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNewCardsPerDay(n)}
                className={`px-lg py-sm rounded-lg border font-body-md text-body-md transition-all ${
                  newCardsPerDay === n
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <label className="block font-body-md text-body-md text-on-surface-variant mb-xs">
            {t("onboarding.orTypeYourOwn")}
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={newCardsPerDay}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) setNewCardsPerDay(Math.min(100, Math.max(1, Math.floor(v))));
            }}
            className="w-full sm:w-40 px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md"
          />
          <p className="font-body-md text-body-md text-on-surface-variant mt-sm text-sm">
            {t("onboarding.perDay", { n: newCardsPerDay, week: newCardsPerDay * 7 })}
          </p>
        </section>

        <div className="mb-lg">
          <label className="flex items-start gap-sm cursor-pointer">
            <input
              type="checkbox"
              checked={privacyChecked}
              onChange={(e) => {
                setPrivacyChecked(e.target.checked);
                if (error) setError(null);
              }}
              className="mt-1 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <span className="font-body-md text-body-md text-on-surface">
              Saya telah membaca dan menyetujui{" "}
              <Link href="/privacy" className="text-primary underline hover:text-primary-container transition-colors">
                Kebijakan Privasi
              </Link>
            </span>
          </label>
        </div>

        {error && (
          <p className="font-body-md text-body-md text-error bg-error-container rounded-lg p-sm mb-md">
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-sm justify-end">
          <button
            type="button"
            onClick={() => router.push("/deck")}
            className="border border-outline-variant rounded-lg px-lg py-sm font-body-md text-body-md text-on-surface-variant hover:bg-surface-variant transition-colors"
          >
            {t("onboarding.skip")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="bg-primary hover:bg-primary-container text-on-primary px-xl py-sm rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm disabled:opacity-40 flex items-center justify-center gap-sm"
          >
            {submitting ? t("onboarding.saving") : t("onboarding.startLearning")}
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              arrow_forward
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}

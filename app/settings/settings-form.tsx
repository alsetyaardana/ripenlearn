// app/settings/settings-form.tsx
// Form Rencana Belajar — client component.
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { DeckSummary } from "@/lib/deck";
import { useLanguage } from "@/contexts/language-context";

interface SettingsFormProps {
  decks: DeckSummary[];
  initial: {
    targetHskLevel: number | null;
    targetCategory: string | null;
    targetDeckId: string | null;
    targetDate: string;
    targetMode: "DATE" | "RATE";
    newCardsPerDay: number;
  };
}

function getHSKOptions(language: "id" | "en") {
  const descs = {
    id: ["Pemula — 300 kata", "Dasar — 498 kata", "Dasar lanjutan — 997 kata", "Menengah — 2.592 kata", "Menengah lanjutan — 4.377 kata", "Advanced — 6.162 kata", "Mastery — 10.959 kata"],
    en: ["Beginner — 300 words", "Elementary — 498 words", "Pre-Intermediate — 997 words", "Intermediate — 2,592 words", "Upper-Intermediate — 4,377 words", "Advanced — 6,162 words", "Mastery — 10,959 words"],
  };
  return [1, 2, 3, 4, 5, 6, 7].map((level, i) => ({
    level,
    label: `HSK ${level}`,
    desc: descs[language][i],
  }));
}

const CATEGORY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "food", label: "Food" },
  { value: "travel", label: "Travel" },
  { value: "home", label: "Home" },
  { value: "health", label: "Health" },
  { value: "money", label: "Money" },
  { value: "work", label: "Work" },
  { value: "emotion", label: "Emotion" },
  { value: "tech", label: "Tech" },
  { value: "romance", label: "Romance" },
];

export default function SettingsForm({ decks, initial }: SettingsFormProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [targetHskLevel, setTargetHskLevel] = useState<number | null>(initial.targetHskLevel);
  const [targetCategory, setTargetCategory] = useState<string | null>(initial.targetCategory);
  const [targetDeckId, setTargetDeckId] = useState<string | null>(initial.targetDeckId);
  const [targetDate, setTargetDate] = useState(initial.targetDate);
  const [targetMode, setTargetMode] = useState<"DATE" | "RATE">(initial.targetMode);
  const [newCardsPerDay, setNewCardsPerDay] = useState(initial.newCardsPerDay);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDeck = targetDeckId ? decks.find((d) => d.id === targetDeckId) ?? null : null;
  const isDailyTalk = selectedDeck !== null && selectedDeck.name.includes("Daily Talk");

  const submit = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const payload: Record<string, unknown> = { newCardsPerDay };
      payload.targetHskLevel = targetHskLevel;
      payload.targetDeckId = targetDeckId;
      payload.targetMode = targetMode;
      payload.targetDate = targetDate || null;
      if (targetCategory !== null) {
        payload.targetCategory = targetCategory;
      }

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
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("settings.errorSaveRetry"));
    } finally {
      setSaving(false);
    }
  }, [targetHskLevel, targetCategory, targetDeckId, targetDate, targetMode, newCardsPerDay, saving, router]);

  const hskOptions = getHSKOptions(language);

  return (
    <div className="flex flex-col gap-lg max-w-2xl">
      {saved && (
        <p className="font-body-md text-body-md text-on-secondary bg-secondary-container border border-secondary rounded-lg p-sm">
          {t("settings.saved")}
        </p>
      )}
      {error && (
        <p className="font-body-md text-body-md text-error bg-error-container rounded-lg p-sm">
          {error}
        </p>
      )}

      {/* Study plan section — Rencana Belajar */}
      <section className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale">
        <h2 className="font-headline-md text-headline-md text-primary mb-sm">{t("settings.sectionStudyPlan")}</h2>

        <div className="flex flex-col gap-md mt-md">
          {!isDailyTalk && (
            <div>
              <h3 className="font-headline-sm text-headline-sm text-primary mb-xs">{t("settings.targetHSK")}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md">
                {t("settings.targetHSKDesc")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                <button
                  type="button"
                  onClick={() => setTargetHskLevel(null)}
                  className={`text-left px-md py-sm rounded-lg border transition-all ${
                    targetHskLevel === null
                      ? "border-primary bg-primary-container text-on-primary-container"
                      : "border-outline-variant bg-surface-container-lowest hover:border-primary text-on-surface"
                  }`}
                >
                  <span className="font-headline-md text-headline-md block">{t("settings.notSure")}</span>
                  <span className="font-body-md text-body-md text-on-surface-variant block">
                    {t("settings.noTarget")}
                  </span>
                </button>
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
            </div>
          )}

          {isDailyTalk && (
            <div>
              <h3 className="font-headline-sm text-headline-sm text-primary mb-xs">{t("settings.targetCategory")}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md">
                {t("settings.targetCategoryDesc")}
              </p>
              <select
                value={targetCategory ?? ""}
                onChange={(e) => setTargetCategory(e.target.value === "" ? null : e.target.value)}
                className="w-full sm:w-auto px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md"
              >
                <option value="">{t("settings.categoryNone")}</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(`settings.category${opt.label}`)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <h3 className="font-headline-sm text-headline-sm text-primary mb-xs">{t("settings.targetDeck")}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-md">
              {t("settings.targetDeckDesc")}
            </p>
            <select
              value={targetDeckId ?? ""}
              onChange={(e) => setTargetDeckId(e.target.value === "" ? null : e.target.value)}
              className="w-full sm:w-auto px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md"
            >
              <option value="">{t("settings.allDecks")}</option>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name} ({deck.totalCardCount} cards)
                </option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="font-headline-sm text-headline-sm text-primary mb-xs">{t("settings.targetMode")}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-md">
              {t("settings.targetModeDesc")}
            </p>
            <select
              value={targetMode}
              onChange={(e) => setTargetMode(e.target.value === "RATE" ? "RATE" : "DATE")}
              className="w-full sm:w-auto px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md"
            >
              <option value="DATE">{t("settings.targetModeDeck")}</option>
              <option value="RATE">{t("settings.targetModeCard")}</option>
            </select>
          </div>

          {targetMode === "DATE" ? (
            <div>
              <h3 className="font-headline-sm text-headline-sm text-primary mb-xs">{t("settings.targetDate")}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md">
                {t("settings.targetDateDesc")}
              </p>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full sm:w-auto px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md"
              />
            </div>
          ) : (
            <div>
              <h3 className="font-headline-sm text-headline-sm text-primary mb-xs">{t("settings.newCardsPerDay")}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md">
                {t("settings.newCardsDesc")}
              </p>
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
                {t("settings.perDay", { n: newCardsPerDay, week: newCardsPerDay * 7 })}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="w-full sm:w-auto bg-primary hover:bg-primary-container text-on-primary px-xl py-sm rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm disabled:opacity-40"
        >
          {saving ? t("settings.saving") : t("settings.save")}
        </button>
      </div>
    </div>
  );
}

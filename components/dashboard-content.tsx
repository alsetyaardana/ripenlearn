// components/dashboard-content.tsx
// Client component — renders dashboard with i18n via useLanguage().
// Server page fetches data and passes it here as props.
"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";

interface DeckSummary {
  name: string;
  globalCardCount: number;
  customCardCount: number;
}

interface Estimate {
  estimatedDate: Date;
  daysRemaining: number;
  status: string;
  requiredNewCardsPerDay: number;
}

interface DashboardContentProps {
  totalDue: number;
  dueCount: number;
  newCount: number;
  masteredCount: number;
  decks: DeckSummary[];
  totalCardsInDecks: number;
  remainingCards: number;
  settings: {
    newCardsPerDay: number;
    targetDate?: Date | null;
  };
  estimate: Estimate;
  estimatedDateStr: string;
}

export default function DashboardContent({
  totalDue,
  dueCount,
  newCount,
  masteredCount,
  decks,
  totalCardsInDecks,
  remainingCards,
  settings,
  estimate,
  estimatedDateStr,
}: DashboardContentProps) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-container-max mx-auto px-md md:px-xl py-lg space-y-xl">
        <h1 className="font-display-lg text-display-lg text-primary">{t("dashboard.title")}</h1>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
          <div className="sm:col-span-2 lg:col-span-2 bg-surface-container-low rounded-xl p-lg border border-unripe-pale flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-xs">{t("dashboard.today")}</h2>
              <div className="flex items-baseline gap-sm">
                <span className="font-display-lg text-display-lg text-primary">{totalDue}</span>
                <span className="font-body-lg text-body-lg text-on-surface-variant">{t("dashboard.dueCards")}</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm max-w-md">
                {decks.length === 0
                  ? t("dashboard.noDeck")
                  : newCount > 0
                    ? t("dashboard.dueAndNew", { dueCount, newCount: Math.min(newCount, settings.newCardsPerDay) })
                    : t("dashboard.newReview", { dueCount })}
              </p>
            </div>
            <div className="relative z-10 mt-xl flex flex-wrap items-center gap-sm">
              {decks.length === 0 ? (
                <Link
                  href="/deck"
                  className="inline-flex items-center gap-sm bg-primary hover:bg-primary-container text-on-primary px-lg py-md rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm"
                >
                  {t("dashboard.createFirstDeck")}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              ) : (
                <Link
                  href="/review"
                  className="inline-flex items-center gap-sm bg-primary hover:bg-primary-container text-on-primary px-lg py-md rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm"
                >
                  {t("dashboard.startReview")}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              )}
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale flex flex-col justify-between">
            <div>
              <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-md">{t("dashboard.mastered")}</h2>
              <div className="flex items-end gap-xs mb-sm">
                <span className="font-headline-md text-headline-md text-primary">{masteredCount}</span>
                <span className="font-body-md text-body-md text-on-surface-variant mb-1">{t("dashboard.masteredWords")}</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                {t("dashboard.masteredDesc")}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
          <div className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale">
            <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-sm">{t("dashboard.estimatedFinish")}</h2>
            <div className="flex items-baseline gap-xs mb-sm">
              <span className="font-headline-md text-headline-md text-primary">
                {estimate.daysRemaining === 0 ? t("dashboard.now") : t("dashboard.daysRemaining", { days: estimate.daysRemaining })}
              </span>
              {estimate.status === "overdue" && (
                <span className="font-label-caps text-label-caps text-error bg-error-container rounded px-sm py-xs">
                  {t("dashboard.overdue")}
                </span>
              )}
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant text-sm mb-md">
              {remainingCards > 0 ? (
                <>
                  {t("dashboard.cardsRemaining", { count: remainingCards })} ·{" "}
                  {settings.targetDate
                    ? estimate.status === "overdue"
                      ? t("dashboard.neededPerDay", { n: estimate.requiredNewCardsPerDay })
                      : t("dashboard.targetPerDay", { n: estimate.requiredNewCardsPerDay })
                    : t("dashboard.perDay", { n: settings.newCardsPerDay })}{" "}
                  · {t("dashboard.finishAround", { date: estimatedDateStr })}
                </>
              ) : (
                t("dashboard.allMastered")
              )}
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-xs text-primary font-body-md text-body-md font-medium hover:underline"
            >
              {t("dashboard.setTarget")}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>

          <div className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale">
            <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-sm">{t("dashboard.deckTitle")}</h2>
            <div className="flex items-baseline gap-xs mb-sm">
              <span className="font-headline-md text-headline-md text-primary">{decks.length}</span>
              <span className="font-body-md text-body-md text-on-surface-variant mb-1">{t("dashboard.deckCount")}</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant text-sm mb-md">
              {t("dashboard.deckCards", { count: totalCardsInDecks })}
            </p>
            <Link
              href="/deck"
              className="inline-flex items-center gap-xs text-primary font-body-md text-body-md font-medium hover:underline"
            >
              {t("dashboard.manageDeck")}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>

          <div className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale">
            <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-sm">{t("dashboard.aiPractice")}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant text-sm mb-md">
              {t("dashboard.aiDesc")}
            </p>
            <div className="flex flex-wrap gap-sm">
              <Link
                href="/chat"
                className="inline-flex items-center gap-xs text-primary font-body-md text-body-md font-medium hover:underline"
              >
                {t("dashboard.chat")}
              </Link>
              <Link
                href="/reading"
                className="inline-flex items-center gap-xs text-primary font-body-md text-body-md font-medium hover:underline"
              >
                {t("dashboard.read")}
              </Link>
              <Link
                href="/exam"
                className="inline-flex items-center gap-xs text-primary font-body-md text-body-md font-medium hover:underline"
              >
                {t("dashboard.exam")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

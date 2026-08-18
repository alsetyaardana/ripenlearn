// app/deck/card-browser.tsx
// Client component: browser kartu dalam satu deck. Menampilkan SEMUA kartu
// (Global via DeckCard->Card, Custom via CustomCard) dengan tab per sumber,
// filter status, pencarian hanzi/pinyin, sort, dan pagination. Semua data
// lewat GET /api/deck/[deckId]/cards/browse — komponen tidak memegang logic.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { useTts } from "@/lib/use-tts";
import { numToSymbolPinyin } from "@/lib/pinyin-format";
import type { CardStatus } from "@prisma/client";

interface BrowseCard {
  cardId: string;
  source: "hsk" | "chunk" | "custom";
  hanzi: string;
  pinyin: string;
  arti: string;
  hskLevel: number | null;
  category: string | null;
  status: CardStatus;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
}

interface BrowseResponse {
  cards: BrowseCard[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

type StatusFilter = "all" | CardStatus;

interface CardBrowserProps {
  deckId: string;
  deckKind?: "HSK" | "CHUNKING" | "CUSTOM";
}

const PAGE_SIZE = 30;

const HSK_LEVELS = [1, 2, 3, 4, 5, 6, 7];

const CATEGORY_KEYS: Record<string, string> = {
  daily: "deck.categoryDaily",
  food: "deck.categoryFood",
  travel: "deck.categoryTravel",
  home: "deck.categoryHome",
  health: "deck.categoryHealth",
  money: "deck.categoryMoney",
  work: "deck.categoryWork",
  emotion: "deck.categoryEmotion",
  tech: "deck.categoryTech",
  romance: "deck.categoryRomance",
};

const STATUS_KEYS: Record<CardStatus, string> = {
  NEW: "deck.statusNew",
  LEARNING: "deck.statusLearning",
  REVIEW: "deck.statusReviewing",
  MASTERED: "deck.statusMastered",
};

const STATUS_BADGE_CLASSES: Record<CardStatus, string> = {
  NEW: "bg-surface-container text-on-surface-variant",
  LEARNING: "bg-secondary-fixed text-on-secondary-fixed",
  REVIEW: "bg-primary-fixed text-on-primary-fixed",
  MASTERED: "bg-primary-container text-on-primary",
};

function formatDate(iso: string | null, lang: "id" | "en"): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CardBrowser({ deckId, deckKind }: CardBrowserProps) {
  const { t, language } = useLanguage();
  const { speak } = useTts();
  const [search, setSearch] = useState("");
  const [hskLevel, setHskLevel] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<BrowseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Debounce pencarian sebelum fetch.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      source: "all",
      status: "all",
      sort: "hanzi",
      search,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (hskLevel !== null) params.set("hskLevel", String(hskLevel));
    if (category !== null) params.set("category", category);
    try {
      const res = await fetch(`/api/deck/${deckId}/cards/browse?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load cards (${res.status})`);
      const json: BrowseResponse = await res.json();
      setData(json);
    } catch {
      setError(t("deck.browseError"));
    } finally {
      setLoading(false);
    }
  }, [deckId, search, hskLevel, category, page, t]);

  // Hapus satu kartu dari deck — payload per source: hsk → cardIds, chunk → dailyTalkCardIds, custom → customCardIds.
  const removeCard = useCallback(
    async (card: BrowseCard) => {
      if (removingId) return;
      if (!window.confirm(`${t("deck.removeCard")} — ${card.hanzi}?`)) return;
      setRemovingId(card.cardId);
      setError(null);
      try {
        const payload =
          card.source === "custom"
            ? { customCardIds: [card.cardId] }
            : card.source === "chunk"
              ? { dailyTalkCardIds: [card.cardId] }
              : { cardIds: [card.cardId] };
        const res = await fetch(`/api/deck/${deckId}/cards`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? t("deck.errorRemoveCards"));
          return;
        }
        await load();
      } catch {
        setError(t("deck.errorRemoveCards"));
      } finally {
        setRemovingId(null);
      }
    },
    [removingId, deckId, load, t]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, search ? 300 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load, search]);

  const cards = data?.cards ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;
  const currentPage = data?.page ?? 1;
  const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(start + cards.length - 1, total);

  return (
    <div className="flex flex-col gap-md">
      {/* Controls — search + filter ringan per tipe deck */}
      <div className="flex flex-col sm:flex-row gap-sm">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder={t("deck.browseSearchPlaceholder")}
          className="flex-1 px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md"
          aria-label={t("deck.browseSearchPlaceholder")}
        />
        {deckKind === "HSK" && (
          <select
            value={hskLevel ?? ""}
            onChange={(e) => {
              setPage(1);
              setHskLevel(e.target.value === "" ? null : Number(e.target.value));
            }}
            className="w-full sm:w-40 px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md"
            aria-label={t("deck.filterHsk")}
          >
            <option value="">{t("deck.filterHskAll")}</option>
            {HSK_LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                {t("deck.filterHsk")} {lv}
              </option>
            ))}
          </select>
        )}
        {deckKind === "CHUNKING" && (
          <select
            value={category ?? ""}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value === "" ? null : e.target.value);
            }}
            className="w-full sm:w-48 px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md"
            aria-label={t("deck.filterCategory")}
          >
            <option value="">{t("deck.filterCategoryAll")}</option>
            {Object.keys(CATEGORY_KEYS).map((cat) => (
              <option key={cat} value={cat}>
                {t(CATEGORY_KEYS[cat])}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {loading && (
        <p className="font-body-md text-body-md text-on-surface-variant">{t("deck.searching")}</p>
      )}
      {error && !loading && (
        <p className="font-body-md text-body-md text-error bg-error-container rounded-lg p-sm">
          {error}
        </p>
      )}

      {!loading && !error && total === 0 && (
        <p className="font-body-md text-body-md text-on-surface-variant">
          {search ? t("deck.browseEmpty") : t("deck.browseNoCards")}
        </p>
      )}

      {!loading && !error && cards.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
            <table className="w-full text-left table-fixed">
              <thead>
                <tr className="border-b border-outline-variant/40">
                  <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap">
                    {t("deck.colHanzi")}
                  </th>
                  <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap">
                    {t("deck.colPinyin")}
                  </th>
                  <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap">
                    {t("deck.colMeaning")}
                  </th>
                  {deckKind === "CHUNKING" ? (
                    <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap">
                      {t("deck.colCategory")}
                    </th>
                  ) : (
                    <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap">
                      {t("deck.colHsk")}
                    </th>
                  )}
                  <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap">
                    {t("deck.colStatus")}
                  </th>
                  <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase leading-tight w-[110px]">
                    {t("deck.colLastReviewed")}
                  </th>
                  <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase leading-tight w-[110px]">
                    {t("deck.colNextReview")}
                  </th>
                  <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap w-[72px] text-right">
                    {t("deck.colActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => (
                  <tr
                    key={`${card.source}-${card.cardId}`}
                    className="border-b border-outline-variant/40 last:border-b-0 hover:bg-surface-container"
                  >
                    <td className="px-md py-sm font-body-lg text-body-lg text-on-surface whitespace-nowrap">
                      <div className="flex items-center gap-sm">
                        {card.hanzi}
                        <button
                          aria-label="Play pronunciation"
                          onClick={() => speak(card.hanzi, "zh")}
                          className="flex items-center justify-center p-xs rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">volume_up</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-md py-sm font-pinyin-ruby text-pinyin-ruby text-on-surface-variant truncate">
                      <span title={card.pinyin ? numToSymbolPinyin(card.pinyin) : ""}>
                        {card.pinyin ? numToSymbolPinyin(card.pinyin) : ""}
                      </span>
                    </td>
                    <td className="px-md py-sm font-body-md text-body-md text-on-surface-variant truncate">
                      <span title={card.arti}>{card.arti}</span>
                    </td>
                    {deckKind === "CHUNKING" ? (
                      <td className="px-md py-sm font-body-md text-body-md text-on-surface-variant whitespace-nowrap">
                        {card.category ? t(CATEGORY_KEYS[card.category] ?? card.category) : "—"}
                      </td>
                    ) : (
                      <td className="px-md py-sm font-body-md text-body-md text-on-surface-variant whitespace-nowrap">
                        {card.source === "custom" && card.hskLevel === null ? "—" : `HSK ${card.hskLevel}`}
                      </td>
                    )}
                    <td className="px-md py-sm whitespace-nowrap">
                      <span
                        className={`font-label-caps text-label-caps px-sm py-xs rounded-full ${STATUS_BADGE_CLASSES[card.status]}`}
                      >
                        {t(STATUS_KEYS[card.status])}
                      </span>
                    </td>
                    <td className="px-md py-sm font-body-md text-body-md text-on-surface-variant whitespace-nowrap">
                      {formatDate(card.lastReviewedAt, language)}
                    </td>
                    <td
                      className={`px-md py-sm font-body-md text-body-md whitespace-nowrap ${
                        card.nextReviewAt && new Date(card.nextReviewAt) < new Date()
                          ? "text-error"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {formatDate(card.nextReviewAt, language)}
                    </td>
                    <td className="px-md py-sm whitespace-nowrap text-right">
                      <button
                        aria-label={t("deck.removeCard")}
                        onClick={() => removeCard(card)}
                        disabled={removingId !== null}
                        className="inline-flex items-center justify-center p-xs rounded hover:bg-error-container text-error transition-colors disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="flex flex-col gap-sm md:hidden">
            {cards.map((card) => (
              <li
                key={`${card.source}-${card.cardId}`}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-md"
              >
                <div className="flex items-start justify-between gap-sm">
                  <div className="min-w-0">
                    <span className="font-body-lg text-body-lg text-on-surface">{card.hanzi}</span>
                    <span className="font-pinyin-ruby text-pinyin-ruby text-on-surface-variant ml-sm">
                      {card.pinyin ? numToSymbolPinyin(card.pinyin) : ""}
                    </span>
                    <button
                      aria-label="Play pronunciation"
                      onClick={() => speak(card.hanzi, "zh")}
                      className="inline-flex items-center justify-center p-xs rounded-full hover:bg-surface-container text-on-surface-variant transition-colors align-middle"
                    >
                      <span className="material-symbols-outlined text-[18px]">volume_up</span>
                    </button>
                  </div>
                  <span
                    className={`font-label-caps text-label-caps px-sm py-xs rounded-full shrink-0 ${STATUS_BADGE_CLASSES[card.status]}`}
                  >
                    {t(STATUS_KEYS[card.status])}
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
                  {card.arti}
                </p>
                <div className="flex flex-wrap gap-x-md gap-y-xs mt-sm font-body-md text-body-md text-on-surface-variant">
                  <span>
                    {deckKind === "CHUNKING"
                      ? card.category
                        ? t(CATEGORY_KEYS[card.category] ?? card.category)
                        : "—"
                      : card.source === "custom" && card.hskLevel === null
                        ? "—"
                        : `HSK ${card.hskLevel}`}
                  </span>
                  <span>
                    {t("deck.colLastReviewed")}: {formatDate(card.lastReviewedAt, language)}
                  </span>
                  <span>
                    {t("deck.colNextReview")}: {formatDate(card.nextReviewAt, language)}
                  </span>
                </div>
                <div className="mt-sm border-t border-outline-variant/40 pt-sm">
                  <button
                    aria-label={t("deck.removeCard")}
                    onClick={() => removeCard(card)}
                    disabled={removingId !== null}
                    className="inline-flex items-center gap-xs px-sm py-xs rounded hover:bg-error-container text-error font-body-md text-body-md transition-colors disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    {t("deck.removeCard")}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-sm">
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t("deck.showing", { start: String(start), end: String(end), total: String(total) })}
            </p>
            <div className="flex items-center gap-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-md py-sm rounded-lg border border-outline-variant font-body-md text-body-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
              >
                {t("deck.prevPage")}
              </button>
              <span className="font-body-md text-body-md text-on-surface-variant">{page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore || loading}
                className="px-md py-sm rounded-lg border border-outline-variant font-body-md text-body-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
              >
                {t("deck.nextPage")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

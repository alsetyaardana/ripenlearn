// lib/card-browser.ts
// Browser kartu dalam satu deck: gabungan Card global (via DeckCard) dan
// CustomCard, lengkap dengan progress user. Logika parsing query, filter,
// sort, dan pagination dipisah (murni, bisa di-test tanpa DB).
//
// Aturan ownership: fungsi ini wajib lewat `assertDeckOwnership` — user lain
// atau deck yang tidak ada mendapat DeckNotFoundError yang sama.

import { assertDeckOwnership } from "./deck";
import { CardStatus, type PrismaClient } from "@prisma/client";

export { DeckNotFoundError } from "./deck";

export type BrowseSource = "all" | "hsk" | "chunk" | "custom";
export type BrowseStatus = "all" | CardStatus;
export type BrowseSort = "hanzi" | "hsk" | "status" | "lastReviewed";

export interface BrowseQuery {
  source: BrowseSource;
  status: BrowseStatus;
  sort: BrowseSort;
  search: string;
  hskLevel: number | null;
  category: string | null;
  page: number;
  pageSize: number;
}

export interface BrowseCard {
  cardId: string;
  source: "hsk" | "chunk" | "custom";
  hanzi: string;
  pinyin: string;
  arti: string;
  hskLevel: number | null;
  category: string | null;
  status: CardStatus;
  dueDate: Date | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
}

export interface BrowseResult {
  cards: BrowseCard[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const VALID_SOURCES: BrowseSource[] = ["all", "hsk", "chunk", "custom"];
const VALID_STATUSES: BrowseStatus[] = ["all", "NEW", "LEARNING", "REVIEW", "MASTERED"];
const VALID_SORTS: BrowseSort[] = ["hanzi", "hsk", "status", "lastReviewed"];

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;
const MIN_PAGE_SIZE = 10;

function parseIntClamped(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseIntOrNull(value: string | null, min: number, max: number): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

/** Parsing query string browser — murni, nilai tidak dikenal diabaikan. */
export function parseBrowseQuery(params: URLSearchParams): BrowseQuery {
  // `tab` adalah alias dari `source` (global|custom); `source` menang kalau keduanya ada.
  const source = params.get("source") as BrowseSource | null;
  const tab = params.get("tab") as BrowseSource | null;
  const status = params.get("status") as BrowseStatus | null;
  const sort = params.get("sort") as BrowseSort | null;
  const search = (params.get("search") ?? "").trim();

  return {
    source:
      source && VALID_SOURCES.includes(source)
        ? source
        : tab && VALID_SOURCES.includes(tab)
          ? tab
          : "all",
    status: status && VALID_STATUSES.includes(status) ? status : "all",
    sort: sort && VALID_SORTS.includes(sort) ? sort : "hanzi",
    search,
    hskLevel: parseIntOrNull(params.get("hskLevel"), 1, 7),
    category: params.get("category")?.trim() || null,
    page: parseIntClamped(params.get("page"), 1, 1, Number.MAX_SAFE_INTEGER),
    // `limit` adalah alias dari `pageSize`; `pageSize` menang kalau keduanya ada.
    pageSize: parseIntClamped(
      params.get("pageSize") ?? params.get("limit"),
      DEFAULT_PAGE_SIZE,
      MIN_PAGE_SIZE,
      MAX_PAGE_SIZE
    ),
  };
}

/** Urutan display status di UI: NEW < LEARNING < REVIEW < MASTERED. */
const STATUS_ORDER: Record<CardStatus, number> = {
  NEW: 0,
  LEARNING: 1,
  REVIEW: 2,
  MASTERED: 3,
};

/**
 * Ambil kartu dalam deck sesuai query browser. Ownership divalidasi dulu.
 * `query` bisa parsial — field yang hilang memakai default parseBrowseQuery.
 * `client` di-inject supaya bisa di-test tanpa DB live.
 */
export async function getDeckBrowseCards(
  client: PrismaClient,
  deckId: string,
  userId: string,
  query: Partial<BrowseQuery>
): Promise<BrowseResult> {
  const q: BrowseQuery = {
    source: query.source ?? "all",
    status: query.status ?? "all",
    sort: query.sort ?? "hanzi",
    search: query.search ?? "",
    hskLevel: query.hskLevel ?? null,
    category: query.category ?? null,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
  };

  await assertDeckOwnership(client, deckId, userId);

  const deck = await client.deck.findUniqueOrThrow({
    where: { id: deckId },
    include: {
      deckHskCards: { include: { card: true } },
      deckChunkCards: { include: { dailyTalkCard: true } },
      customCards: true,
    },
  });

  const hskCardIds = deck.deckHskCards.map((dc) => dc.cardId);
  const chunkCardIds = deck.deckChunkCards.map((dc) => dc.dailyTalkCardId);
  const customCardIds = deck.customCards.map((cc) => cc.id);

  const [hskProgress, chunkProgress, customProgress] = await Promise.all([
    hskCardIds.length > 0
      ? client.cardProgress.findMany({ where: { userId, cardId: { in: hskCardIds } } })
      : Promise.resolve([]),
    chunkCardIds.length > 0
      ? client.dailyTalkProgress.findMany({ where: { userId, dailyTalkCardId: { in: chunkCardIds } } })
      : Promise.resolve([]),
    customCardIds.length > 0
      ? client.customCardProgress.findMany({ where: { userId, customCardId: { in: customCardIds } } })
      : Promise.resolve([]),
  ]);

  const hskProgressByCard = new Map(hskProgress.map((p) => [p.cardId, p]));
  const chunkProgressByCard = new Map(chunkProgress.map((p) => [p.dailyTalkCardId, p]));
  const customProgressByCard = new Map(customProgress.map((p) => [p.customCardId, p]));

  const cards: BrowseCard[] = [
    ...deck.deckHskCards.map((dc) => {
      const p = hskProgressByCard.get(dc.cardId);
      return {
        cardId: dc.card.id,
        source: "hsk" as const,
        hanzi: dc.card.hanzi,
        pinyin: dc.card.pinyin,
        arti: dc.card.artiId,
        hskLevel: dc.card.hskLevel,
        category: null,
        status: p?.status ?? CardStatus.NEW,
        dueDate: p?.dueDate ?? null,
        lastReviewedAt: p?.lastReviewedAt ?? null,
        nextReviewAt: p?.dueDate ?? null,
      };
    }),
    ...deck.deckChunkCards.map((dc) => {
      const p = chunkProgressByCard.get(dc.dailyTalkCardId);
      return {
        cardId: dc.dailyTalkCard.id,
        source: "chunk" as const,
        hanzi: dc.dailyTalkCard.hanzi,
        pinyin: dc.dailyTalkCard.pinyin,
        arti: dc.dailyTalkCard.arti,
        hskLevel: null,
        category: dc.dailyTalkCard.category,
        status: p?.status ?? CardStatus.NEW,
        dueDate: p?.dueDate ?? null,
        lastReviewedAt: p?.lastReviewedAt ?? null,
        nextReviewAt: p?.dueDate ?? null,
      };
    }),
    ...deck.customCards.map((cc) => {
      const p = customProgressByCard.get(cc.id);
      return {
        cardId: cc.id,
        source: "custom" as const,
        hanzi: cc.hanzi,
        pinyin: cc.pinyin,
        arti: cc.arti,
        hskLevel: cc.hskLevel ?? null,
        category: null,
        status: p?.status ?? CardStatus.NEW,
        dueDate: p?.dueDate ?? null,
        lastReviewedAt: p?.lastReviewedAt ?? null,
        nextReviewAt: p?.dueDate ?? null,
      };
    }),
  ];

  const filtered = cards.filter((c) => {
    if (q.source !== "all" && c.source !== q.source) return false;
    if (q.status !== "all" && c.status !== q.status) return false;
    if (q.hskLevel !== null && c.hskLevel !== q.hskLevel) return false;
    if (q.category !== null && c.category !== q.category) return false;
    if (q.search) {
      const needle = q.search.toLowerCase();
      if (!c.hanzi.toLowerCase().includes(needle) && !c.pinyin.toLowerCase().includes(needle)) {
        return false;
      }
    }
    return true;
  });

  switch (q.sort) {
    case "hsk":
      filtered.sort((a, b) => (a.hskLevel ?? 0) - (b.hskLevel ?? 0) || a.hanzi.localeCompare(b.hanzi));
      break;
    case "status":
      filtered.sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.hanzi.localeCompare(b.hanzi)
      );
      break;
    case "lastReviewed":
      filtered.sort(
        (a, b) =>
          (b.lastReviewedAt?.getTime() ?? 0) - (a.lastReviewedAt?.getTime() ?? 0) ||
          a.hanzi.localeCompare(b.hanzi)
      );
      break;
    default: // hanzi
      filtered.sort((a, b) => a.hanzi.localeCompare(b.hanzi));
  }

  const total = filtered.length;
  const start = (q.page - 1) * q.pageSize;
  const pageCards = filtered.slice(start, start + q.pageSize);

  return {
    cards: pageCards,
    total,
    page: q.page,
    pageSize: q.pageSize,
    hasMore: start + q.pageSize < total,
  };
}

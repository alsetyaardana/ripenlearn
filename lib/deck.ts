// lib/deck.ts
// Dipegang oleh: srs-engine-agent (koordinasi dengan db-schema-agent untuk schema Deck)
// Logic deck custom per user: subset dari Card global / DailyTalkCard + custom card sendiri.
//
// Model baru (schema 2026-08): satu Deck punya kind (HSK | CHUNKING | CUSTOM) yang
// menentukan sumber kartunya:
//   1. HSK      -> DeckHskCard -> Card global (HSK 3.0 resmi, level 1-7)
//   2. CHUNKING -> DeckChunkCard -> DailyTalkCard (percakapan sehari-hari, kategori tema)
//   3. CUSTOM   -> CustomCard buatan user, scoped ke satu Deck
//
// Review session, FSRS progress, dan vocab-gate untuk AI HARUS menggabungkan sumber
// yang relevan per deck saat membangun "kartu yang due" atau "vocab mastered".

import type { PrismaClient } from "@prisma/client";
import { CardStatus, type CardType } from "@prisma/client";
import { scheduleReview, type ReviewRating } from "./fsrs";
import { prisma } from "./prisma";

/**
 * Tipe client Prisma yang dipakai semua fungsi deck. Di-inject (bukan import
 * langsung dari ./prisma) supaya bisa di-test dengan fake prisma tanpa DB live.
 */
export type DeckClient = PrismaClient;

export type CardSource = "hsk" | "chunk" | "custom";

export interface DeckSummary {
  id: string;
  name: string;
  description: string | null;
  kind: "HSK" | "CHUNKING" | "CUSTOM";
  hskCardCount: number;
  chunkCardCount: number;
  customCardCount: number;
  /** Total kartu semua sumber — dipakai UI (badge jumlah kartu per deck). */
  totalCardCount: number;
}

export interface DeckCardEntry {
  source: CardSource;
  id: string;
  hanzi: string;
  pinyin: string;
  arti: string;
  hskLevel: number | null;
  category?: string | null;
}

/**
 * Error seragam untuk "deck tidak ada ATAU bukan milik user" — satu error untuk
 * keduanya supaya tidak membocorkan metadata (user lain tidak bisa membedakan).
 */
export class DeckNotFoundError extends Error {
  constructor() {
    super("Deck not found");
    this.name = "DeckNotFoundError";
  }
}

// ============================================================
// Validasi payload (murni, tanpa DB) — dipakai route handler
// ============================================================

type ValidationOk<T> = { ok: true; value: T };
type ValidationFail = { ok: false; error: string };
type ValidationResult<T> = ValidationOk<T> | ValidationFail;

export interface DeckPayload {
  name: string;
  description?: string;
}

/** Validasi payload create deck: name wajib non-empty (di-trim). */
export function validateDeckPayload(body: unknown): ValidationResult<DeckPayload> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid body" };
  }
  const record = body as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) return { ok: false, error: "Name is required" };

  let description: string | undefined;
  if (typeof record.description === "string") {
    const trimmed = record.description.trim();
    if (trimmed) description = trimmed;
  }
  return { ok: true, value: { name, description } };
}

export interface CardIdsPayload {
  cardIds: string[];
}

/** Validasi payload { cardIds: string[] } — non-empty, semua string non-blank. */
export function validateCardIdsPayload(body: unknown): ValidationResult<CardIdsPayload> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid body" };
  }
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.cardIds) || record.cardIds.length === 0) {
    return { ok: false, error: "cardIds wajib array non-empty" };
  }
  const cardIds = record.cardIds.map((id) => (typeof id === "string" ? id.trim() : ""));
  if (cardIds.some((id) => !id)) {
    return { ok: false, error: "cardIds harus berisi string non-blank" };
  }
  return { ok: true, value: { cardIds } };
}

export interface HskLevelsPayload {
  hskLevels: number[];
}

/** Validasi payload { hskLevel: number[] } — array integer 1-7 (level resmi HSK 3.0). */
export function validateHskLevelsPayload(body: unknown): ValidationResult<HskLevelsPayload> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid body" };
  }
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.hskLevel) || record.hskLevel.length === 0) {
    return { ok: false, error: "hskLevel wajib array non-empty" };
  }
  const hskLevels = record.hskLevel.map((level) =>
    typeof level === "number" && Number.isInteger(level) ? level : -1
  );
  if (hskLevels.some((level) => level < 1 || level > 7)) {
    return { ok: false, error: "hskLevel harus integer 1-7" };
  }
  return { ok: true, value: { hskLevels } };
}

// Kategori tema Daily Talk (kartu percakapan sehari-hari). Nilai canonical sesuai
// scripts/classify-category.ts.
export const DAILY_TALK_CATEGORIES = ["daily", "tech", "romance"] as const;
export type DailyTalkCategory = (typeof DAILY_TALK_CATEGORIES)[number];

export interface CategoriesPayload {
  categories: string[];
}

/** Validasi payload { categories: string[] } — subset kategori Daily Talk, non-empty. */
export function validateCategoriesPayload(body: unknown): ValidationResult<CategoriesPayload> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid body" };
  }
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.categories) || record.categories.length === 0) {
    return { ok: false, error: "categories wajib array non-empty" };
  }
  const categories = record.categories.map((c) => (typeof c === "string" ? c.trim() : ""));
  if (categories.some((c) => !(DAILY_TALK_CATEGORIES as readonly string[]).includes(c))) {
    return { ok: false, error: `categories harus subset dari: ${DAILY_TALK_CATEGORIES.join(", ")}` };
  }
  return { ok: true, value: { categories } };
}

// ============================================================
// Ownership
// ============================================================

/** Pastikan deck ada DAN milik user. Kalau tidak, throw DeckNotFoundError. */
export async function assertDeckOwnership(
  client: DeckClient,
  deckId: string,
  userId: string
): Promise<void> {
  const deck = await client.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.userId !== userId) {
    throw new DeckNotFoundError();
  }
}

/** Ambil kind deck; throw DeckNotFoundError untuk non-pemilik / tidak ada. */
export async function getDeckKind(
  client: DeckClient,
  deckId: string,
  userId: string
): Promise<"HSK" | "CHUNKING" | "CUSTOM"> {
  const deck = await client.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.userId !== userId) {
    throw new DeckNotFoundError();
  }
  return deck.kind;
}

/** Buat deck baru untuk user. Default kind CUSTOM (deck kosong belum punya arah). */
export async function createDeck(
  userId: string,
  name: string,
  description?: string,
  client: DeckClient = undefined as unknown as DeckClient,
  kind: "HSK" | "CHUNKING" | "CUSTOM" = "CUSTOM"
) {
  return client.deck.create({
    data: { userId, name, description, kind },
  });
}

/** Tambah subset Card global (HSK) ke deck HSK. Idempotent — skip yang sudah ada. */
export async function addGlobalCardsToDeck(
  client: DeckClient,
  deckId: string,
  userId: string,
  cardIds: string[]
) {
  await assertDeckOwnership(client, deckId, userId);
  await client.deckHskCard.createMany({
    data: cardIds.map((cardId) => ({ deckId, cardId })),
    skipDuplicates: true,
  });
}

/** Tambah subset DailyTalkCard ke deck CHUNKING. Idempotent — skip yang sudah ada. */
export async function addChunkCardsToDeck(
  client: DeckClient,
  deckId: string,
  userId: string,
  dailyTalkCardIds: string[]
) {
  await assertDeckOwnership(client, deckId, userId);
  await client.deckChunkCard.createMany({
    data: dailyTalkCardIds.map((dailyTalkCardId) => ({ deckId, dailyTalkCardId })),
    skipDuplicates: true,
  });
}

/** Tambah SEMUA Card global pada level HSK tertentu ke deck. Idempotent. */
export async function addHskLevelToDeck(
  client: DeckClient,
  deckId: string,
  userId: string,
  hskLevels: number[]
): Promise<{ added: number }> {
  await assertDeckOwnership(client, deckId, userId);
  const cards = await client.card.findMany({
    where: { hskLevel: { in: hskLevels } },
    select: { id: true },
  });
  if (cards.length > 0) {
    await addGlobalCardsToDeck(
      client,
      deckId,
      userId,
      cards.map((c) => c.id)
    );
  }
  return { added: cards.length };
}

/** Tambah SEMUA DailyTalkCard pada kategori tema tertentu ke deck. Idempotent. */
export async function addCategoryToDeck(
  client: DeckClient,
  deckId: string,
  userId: string,
  category: string
): Promise<{ added: number }> {
  await assertDeckOwnership(client, deckId, userId);
  const cards = await client.dailyTalkCard.findMany({
    where: { category },
    select: { id: true },
  });
  if (cards.length > 0) {
    await addChunkCardsToDeck(
      client,
      deckId,
      userId,
      cards.map((c) => c.id)
    );
  }
  return { added: cards.length };
}

/** Hapus subset Card global (HSK) dari deck. Hanya hapus join row — Card global & progress user tidak tersentuh. */
export async function removeCardsFromDeck(
  client: DeckClient,
  deckId: string,
  userId: string,
  cardIds: string[]
): Promise<{ removed: number }> {
  await assertDeckOwnership(client, deckId, userId);
  const result = await client.deckHskCard.deleteMany({
    where: { deckId, cardId: { in: cardIds } },
  });
  return { removed: result.count };
}

/** Hapus subset DailyTalkCard dari deck CHUNKING. Hanya join row — DailyTalkCard & progress user tidak tersentuh. */
export async function removeChunkCardsFromDeck(
  client: DeckClient,
  deckId: string,
  userId: string,
  dailyTalkCardIds: string[]
): Promise<{ removed: number }> {
  await assertDeckOwnership(client, deckId, userId);
  const result = await client.deckChunkCard.deleteMany({
    where: { deckId, dailyTalkCardId: { in: dailyTalkCardIds } },
  });
  return { removed: result.count };
}

/** Hapus SEMUA DailyTalkCard satu kategori dari deck. */
export async function removeCategoryFromDeck(
  client: DeckClient,
  deckId: string,
  userId: string,
  category: string
): Promise<{ removed: number }> {
  const cards = await client.dailyTalkCard.findMany({
    where: { category },
    select: { id: true },
  });
  if (cards.length === 0) return { removed: 0 };
  return removeChunkCardsFromDeck(
    client,
    deckId,
    userId,
    cards.map((c) => c.id)
  );
}

/** Hapus SEMUA Card global pada level HSK tertentu dari deck. */
export async function removeHskLevelFromDeck(
  client: DeckClient,
  deckId: string,
  userId: string,
  hskLevels: number[]
): Promise<{ removed: number }> {
  const cards = await client.card.findMany({
    where: { hskLevel: { in: hskLevels } },
    select: { id: true },
  });
  if (cards.length === 0) return { removed: 0 };
  return removeCardsFromDeck(
    client,
    deckId,
    userId,
    cards.map((c) => c.id)
  );
}

/** Hapus custom card milik user dari deck (row CustomCard + CustomCardProgress-nya). */
export async function removeCustomCardsFromDeck(
  client: DeckClient,
  deckId: string,
  userId: string,
  customCardIds: string[]
): Promise<{ removed: number }> {
  await assertDeckOwnership(client, deckId, userId);
  const progress = await client.customCardProgress.deleteMany({
    where: { customCardId: { in: customCardIds } },
  });
  const cards = await client.customCard.deleteMany({
    where: { id: { in: customCardIds }, deckId },
  });
  return { removed: progress.count + cards.count };
}

/** Tambah custom card buatan user sendiri ke deck. */
export async function addCustomCardToDeck(
  client: DeckClient,
  deckId: string,
  userId: string,
  data: { hanzi: string; pinyin: string; arti: string; hskLevel?: number; exampleSentence?: string }
) {
  await assertDeckOwnership(client, deckId, userId);
  return client.customCard.create({
    data: { deckId, userId, ...data },
  });
}

/** Hapus deck milik user. Throw DeckNotFoundError untuk non-pemilik / tidak ada. */
export async function deleteDeck(client: DeckClient, deckId: string, userId: string) {
  await assertDeckOwnership(client, deckId, userId);
  await client.deck.delete({ where: { id: deckId } });
}

/**
 * Ambil semua kartu dalam satu deck, digabung jadi satu list dengan shape
 * konsisten untuk keperluan review session. Sumber ditentukan dari deck.kind.
 */
export async function getDeckCards(client: DeckClient, deckId: string): Promise<DeckCardEntry[]> {
  const deck = await client.deck.findUnique({
    where: { id: deckId },
    include: {
      deckHskCards: { include: { card: true } },
      deckChunkCards: { include: { dailyTalkCard: true } },
      customCards: true,
    },
  });
  if (!deck) return [];

  const hskCards: DeckCardEntry[] = deck.deckHskCards.map((dc) => ({
    source: "hsk",
    id: dc.card.id,
    hanzi: dc.card.hanzi,
    pinyin: dc.card.pinyin,
    arti: dc.card.artiId,
    hskLevel: dc.card.hskLevel,
  }));

  const chunkCards: DeckCardEntry[] = deck.deckChunkCards.map((dc) => ({
    source: "chunk",
    id: dc.dailyTalkCard.id,
    hanzi: dc.dailyTalkCard.hanzi,
    pinyin: dc.dailyTalkCard.pinyin,
    arti: dc.dailyTalkCard.arti,
    hskLevel: null,
    category: dc.dailyTalkCard.category,
  }));

  const customCards: DeckCardEntry[] = deck.customCards.map((cc) => ({
    source: "custom",
    id: cc.id,
    hanzi: cc.hanzi,
    pinyin: cc.pinyin,
    arti: cc.arti,
    hskLevel: cc.hskLevel ?? null,
  }));

  return [...hskCards, ...chunkCards, ...customCards];
}

/** List semua deck milik user, dengan ringkasan jumlah kartu per sumber. */
export async function listDecksForUser(userId: string): Promise<DeckSummary[]> {
  const decks = await prisma.deck.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { deckHskCards: true, deckChunkCards: true, customCards: true },
      },
    },
  });

  return decks.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    kind: d.kind,
    hskCardCount: d._count.deckHskCards,
    chunkCardCount: d._count.deckChunkCards,
    customCardCount: d._count.customCards,
    totalCardCount: d._count.deckHskCards + d._count.deckChunkCards + d._count.customCards,
  }));
}

/**
 * Jumlah Card global (HSK) yang BELUM ada di deck, per level HSK resmi (1-7).
 * Dipakai material picker di UI deck supaya angka di modal = "kata yang bisa
 * ditambahkan", bukan total global kurikulum.
 */
export async function getDeckCardCountsByHskLevel(
  client: DeckClient,
  deckId: string
): Promise<{ level: number; count: number }[]> {
  const grouped = await client.card.groupBy({
    by: ["hskLevel"],
    where: {
      hskLevel: { in: [1, 2, 3, 4, 5, 6, 7] },
      deckHskCards: { none: { deckId } },
    },
    _count: { _all: true },
    orderBy: { hskLevel: "asc" },
  });

  return grouped.map((g) => ({ level: g.hskLevel, count: g._count._all }));
}

/** Jumlah Card global per level HSK resmi (1-7) — dipakai material picker di UI deck. */
export async function getCardCountsByHskLevel(
  client: DeckClient
): Promise<{ level: number; count: number }[]> {
  const grouped = await client.card.groupBy({
    by: ["hskLevel"],
    where: { hskLevel: { in: [1, 2, 3, 4, 5, 6, 7] } },
    _count: { _all: true },
    orderBy: { hskLevel: "asc" },
  });

  return grouped.map((g) => ({ level: g.hskLevel, count: g._count._all }));
}

/**
 * Jumlah DailyTalkCard yang BELUM ada di deck, per kategori tema.
 * Dipakai material picker di UI deck supaya angka di modal = "kartu yang bisa
 * ditambahkan", bukan total global kurikulum.
 */
export async function getDeckCardCountsByCategory(
  client: DeckClient,
  deckId: string
): Promise<{ category: string; count: number }[]> {
  const inDeck = new Set(
    (
      await client.deckChunkCard.findMany({
        where: { deckId },
        select: { dailyTalkCardId: true },
      })
    ).map((r) => r.dailyTalkCardId)
  );
  const all = await client.dailyTalkCard.findMany({ select: { id: true, category: true } });
  const counts = new Map<string, number>();
  for (const c of all) {
    if (inDeck.has(c.id)) continue;
    counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Jenis kurikulum sebuah deck — sekarang dibaca langsung dari Deck.kind
 * (tidak lagi diinfer dari isi kartu).
 */
export async function getDeckCurriculumKind(
  client: DeckClient,
  deckId: string
): Promise<"hsk" | "category"> {
  const deck = await client.deck.findUnique({
    where: { id: deckId },
    select: { kind: true },
  });
  if (!deck) return "hsk";
  return deck.kind === "CHUNKING" ? "category" : "hsk";
}

/** Kartu review dengan shape konsisten — semua sumber punya field sama. */
export interface NormalizedReviewCard {
  source: "hsk" | "chunk" | "custom";
  cardId: string;
  hanzi: string;
  pinyin: string;
  artiId: string;
  artiEn: string;
  tipe: CardType;
  hskLevel: number | null;
  category?: string | null;
  status: CardStatus;
  dueDate: Date | null;
}

type ProgressRow = {
  status: CardStatus;
  dueDate: Date;
  stability: number;
  difficulty: number;
  reviewCount: number;
  lapses: number;
  lastReviewedAt: Date | null;
};

/** Normalisasi row Card global (dari DeckHskCard.include.card) jadi shape review. */
export function normalizeReviewCard(
  source: "hsk",
  row: {
    id: string;
    hanzi: string;
    pinyin: string;
    artiId: string;
    artiEn: string;
    tipe: CardType;
    hskLevel: number;
  },
  progress: ProgressRow | null
): NormalizedReviewCard;
/** Normalisasi row DailyTalkCard (dari DeckChunkCard.include.dailyTalkCard). */
export function normalizeReviewCard(
  source: "chunk",
  row: {
    id: string;
    hanzi: string;
    pinyin: string;
    arti: string;
    category: string;
  },
  progress: ProgressRow | null
): NormalizedReviewCard;
/** Normalisasi row CustomCard jadi shape review. */
export function normalizeReviewCard(
  source: "custom",
  row: {
    id: string;
    hanzi: string;
    pinyin: string;
    arti: string;
    hskLevel: number | null;
  },
  progress: ProgressRow | null
): NormalizedReviewCard;
export function normalizeReviewCard(
  source: "hsk" | "chunk" | "custom",
  row: {
    id: string;
    hanzi: string;
    pinyin: string;
    artiId?: string;
    artiEn?: string;
    arti?: string;
    tipe?: CardType;
    hskLevel?: number | null;
    category?: string;
  },
  progress: ProgressRow | null
): NormalizedReviewCard {
  return {
    source,
    cardId: row.id,
    hanzi: row.hanzi,
    pinyin: row.pinyin,
    artiId: source === "hsk" ? (row.artiId ?? "") : (row.arti ?? ""),
    artiEn: source === "hsk" ? (row.artiEn ?? "") : "",
    tipe: row.tipe ?? "RENDU",
    hskLevel: source === "chunk" ? null : (row.hskLevel ?? null),
    category: source === "chunk" ? (row.category ?? null) : null,
    status: progress?.status ?? CardStatus.NEW,
    dueDate: progress?.dueDate ?? null,
  };
}

/**
 * Routing rating review ke model progress yang benar berdasarkan sumber kartu
 * (hsk -> CardProgress, chunk -> DailyTalkProgress, custom -> CustomCardProgress)
 * dengan atomik upsert.
 */
export async function reviewCardForUser(
  client: DeckClient,
  userId: string,
  card: { source: "hsk" | "chunk" | "custom"; cardId: string },
  rating: ReviewRating
) {
  if (card.source === "hsk") {
    const cardRow = await client.card.findUnique({ where: { id: card.cardId } });
    if (!cardRow) throw new DeckNotFoundError();
    const existing = await client.cardProgress.findUnique({
      where: { userId_cardId: { userId, cardId: card.cardId } },
    });
    const current: ProgressRow = existing ?? {
      status: CardStatus.NEW,
      dueDate: new Date(),
      stability: 0,
      difficulty: 0,
      reviewCount: 0,
      lapses: 0,
      lastReviewedAt: null,
    };
    const next = scheduleReview(current, rating);
    return client.cardProgress.upsert({
      where: { userId_cardId: { userId, cardId: card.cardId } },
      create: { userId, cardId: card.cardId, ...next },
      update: next,
    });
  }

  if (card.source === "chunk") {
    const cardRow = await client.dailyTalkCard.findUnique({ where: { id: card.cardId } });
    if (!cardRow) throw new DeckNotFoundError();
    const existing = await client.dailyTalkProgress.findUnique({
      where: { userId_dailyTalkCardId: { userId, dailyTalkCardId: card.cardId } },
    });
    const current: ProgressRow = existing ?? {
      status: CardStatus.NEW,
      dueDate: new Date(),
      stability: 0,
      difficulty: 0,
      reviewCount: 0,
      lapses: 0,
      lastReviewedAt: null,
    };
    const next = scheduleReview(current, rating);
    return client.dailyTalkProgress.upsert({
      where: { userId_dailyTalkCardId: { userId, dailyTalkCardId: card.cardId } },
      create: { userId, dailyTalkCardId: card.cardId, ...next },
      update: next,
    });
  }

  const customRow = await client.customCard.findUnique({ where: { id: card.cardId } });
  if (!customRow || customRow.userId !== userId) throw new DeckNotFoundError();
  const existing = await client.customCardProgress.findUnique({
    where: { userId_customCardId: { userId, customCardId: card.cardId } },
  });
  const current: ProgressRow = existing ?? {
    status: CardStatus.NEW,
    dueDate: new Date(),
    stability: 0,
    difficulty: 0,
    reviewCount: 0,
    lapses: 0,
    lastReviewedAt: null,
  };
  const next = scheduleReview(current, rating);
  return client.customCardProgress.upsert({
    where: { userId_customCardId: { userId, customCardId: card.cardId } },
    create: { userId, customCardId: card.cardId, ...next },
    update: next,
  });
}

/**
 * Ambil semua kandidat review dari deck (per kind) lengkap dengan progress user
 * untuk menandai status due/new.
 */
export async function getDeckReviewCandidates(
  client: DeckClient,
  userId: string,
  deckId: string
): Promise<{ cards: NormalizedReviewCard[] }> {
  const deck = await client.deck.findUnique({
    where: { id: deckId },
    include: {
      deckHskCards: { include: { card: true } },
      deckChunkCards: { include: { dailyTalkCard: true } },
      customCards: true,
    },
  });
  if (!deck || deck.userId !== userId) throw new DeckNotFoundError();

  const hskIds = deck.deckHskCards.map((dc) => dc.card.id);
  const chunkIds = deck.deckChunkCards.map((dc) => dc.dailyTalkCard.id);
  const customIds = deck.customCards.map((cc) => cc.id);

  const [hskProgress, chunkProgress, customProgress] = await Promise.all([
    hskIds.length > 0
      ? client.cardProgress.findMany({ where: { userId, cardId: { in: hskIds } } })
      : Promise.resolve([]),
    chunkIds.length > 0
      ? client.dailyTalkProgress.findMany({ where: { userId, dailyTalkCardId: { in: chunkIds } } })
      : Promise.resolve([]),
    customIds.length > 0
      ? client.customCardProgress.findMany({ where: { userId, customCardId: { in: customIds } } })
      : Promise.resolve([]),
  ]);

  const hProgress = new Map(hskProgress.map((p) => [p.cardId, p]));
  const kProgress = new Map(chunkProgress.map((p) => [p.dailyTalkCardId, p]));
  const cProgress = new Map(customProgress.map((p) => [p.customCardId, p]));

  const cards: NormalizedReviewCard[] = [
    ...deck.deckHskCards.map((dc) =>
      normalizeReviewCard("hsk", dc.card, (hProgress.get(dc.card.id) as ProgressRow) ?? null)
    ),
    ...deck.deckChunkCards.map((dc) =>
      normalizeReviewCard(
        "chunk",
        dc.dailyTalkCard,
        (kProgress.get(dc.dailyTalkCard.id) as ProgressRow) ?? null
      )
    ),
    ...deck.customCards.map((cc) =>
      normalizeReviewCard("custom", cc, (cProgress.get(cc.id) as ProgressRow) ?? null)
    ),
  ];

  return { cards };
}

/**
 * Grade jawaban exam (server-owned mapping): update FSRS untuk kartu target.
 * Soal tanpa cardId diabaikan.
 */
export async function gradeExamAnswer(
  client: DeckClient,
  userId: string,
  card: { source: "hsk" | "chunk" | "custom"; cardId: string | null },
  correct: boolean
) {
  if (!card.cardId) return null;
  return reviewCardForUser(client, userId, { source: card.source, cardId: card.cardId }, correct ? "good" : "again");
}

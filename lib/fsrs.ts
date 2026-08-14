// lib/fsrs.ts
// Dipegang oleh: srs-engine-agent (.opencode/agent/srs-engine-agent.md)
// Wrapper di atas ts-fsrs. Lihat AGENTS.md untuk definisi "mastered".

import {
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade,
  createEmptyCard,
} from "ts-fsrs";
import { prisma } from "./prisma";
import { CardStatus } from "@prisma/client";

const params = generatorParameters({ enable_fuzz: true });
const scheduler = fsrs(params);

export type ReviewRating = "again" | "hard" | "good" | "easy";

const RATING_MAP: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

// Threshold "mastered" — lihat AGENTS.md sebelum mengubah.
const MASTERED_STABILITY_DAYS = 21;
const MASTERED_CONSECUTIVE_SUCCESS = 3;

export function isMastered(stability: number, consecutiveSuccess: number): boolean {
  return stability >= MASTERED_STABILITY_DAYS || consecutiveSuccess >= MASTERED_CONSECUTIVE_SUCCESS;
}

function stateToStatus(state: State): CardStatus {
  switch (state) {
    case State.New:
      return CardStatus.NEW;
    case State.Learning:
    case State.Relearning:
      return CardStatus.LEARNING;
    case State.Review:
    default:
      return CardStatus.REVIEW;
  }
}

const STATUS_TO_STATE: Record<CardStatus, State> = {
  NEW: State.New,
  LEARNING: State.Learning,
  REVIEW: State.Review,
  // "Mastered" bukan state FSRS asli — diperlakukan sebagai Review supaya scheduler
  // tetap menghitung interval lanjutan secara normal.
  MASTERED: State.Review,
};

export interface ProgressLike {
  stability: number;
  difficulty: number;
  dueDate: Date;
  reviewCount: number;
  lapses: number;
  status: CardStatus;
  lastReviewedAt: Date | null;
}

/**
 * Konversi row CardProgress/CustomCardProgress jadi FsrsCard.
 *
 * NOTE: schema kita tidak menyimpan elapsed_days/scheduled_days secara native —
 * field ini didekati dari selisih dueDate/lastReviewedAt terhadap waktu sekarang.
 * ts-fsrs merecompute elapsed time dari `now` yang dikirim ke repeat(), jadi
 * pendekatan ini cukup akurat untuk penjadwalan. Kalau nanti butuh presisi historis
 * penuh (mis. laporan interval per review), pertimbangkan menambah field native ke
 * schema — itu perubahan schema, perlu konfirmasi user dulu (lihat AGENTS.md).
 */
function progressToFsrsCard(progress: ProgressLike): FsrsCard {
  const lastReview = progress.lastReviewedAt ?? undefined;
  const elapsedDays = lastReview
    ? Math.max(0, Math.floor((Date.now() - lastReview.getTime()) / 86400000))
    : 0;
  const scheduledDays = lastReview
    ? Math.max(0, Math.floor((progress.dueDate.getTime() - lastReview.getTime()) / 86400000))
    : 0;

  return {
    due: progress.dueDate,
    stability: progress.stability,
    difficulty: progress.difficulty,
    elapsed_days: elapsedDays,
    scheduled_days: scheduledDays,
    reps: progress.reviewCount,
    lapses: progress.lapses,
    state: STATUS_TO_STATE[progress.status],
    last_review: lastReview,
  };
}

export interface ScheduleResult {
  stability: number;
  difficulty: number;
  dueDate: Date;
  reviewCount: number;
  lapses: number;
  status: CardStatus;
  lastReviewedAt: Date;
}

/**
 * Hitung state baru kartu berdasarkan rating user, dalam shape yang siap ditulis
 * langsung ke CardProgress/CustomCardProgress.
 *
 * Definisi "mastered" resmi (AGENTS.md) pakai OR dari dua kondisi: stability >= 21
 * hari ATAU N review berturut-turut tanpa lapse. Schema saat ini tidak menyimpan
 * counter "consecutive success" per kartu, jadi untuk sekarang hanya kondisi
 * stability yang dievaluasi di sini (isMastered dipanggil dengan consecutiveSuccess
 * konstan 0 — cukup untuk tidak salah-positif, cuma belum mengaktifkan jalur kedua).
 * Menambah counter itu butuh field baru di CardProgress/CustomCardProgress —
 * perubahan schema, perlu dikonfirmasi user dulu sebelum dikerjakan.
 */
export function scheduleReview(current: ProgressLike, rating: ReviewRating): ScheduleResult {
  const fsrsCard = progressToFsrsCard(current);
  const now = new Date();
  const result = scheduler.repeat(fsrsCard, now)[RATING_MAP[rating]];
  const next = result.card;

  return {
    stability: next.stability,
    difficulty: next.difficulty,
    dueDate: next.due,
    reviewCount: next.reps,
    lapses: next.lapses,
    status: isMastered(next.stability, 0) ? CardStatus.MASTERED : stateToStatus(next.state),
    lastReviewedAt: now,
  };
}

export function newCardState(): FsrsCard {
  return createEmptyCard();
}

export interface MasteredCard {
  hanzi: string;
  pinyin: string;
  artiId: string;
}

/**
 * Ambil daftar kartu mastered milik user — dipakai ai-integration-agent untuk
 * vocab gate (Fase 2). Fase 1: Card global saja. Penggabungan dengan CustomCard
 * per-deck menyusul di Fase 1.5 (lihat lib/deck.ts).
 */
export async function getMasteredCards(userId: string): Promise<MasteredCard[]> {
  const progress = await prisma.cardProgress.findMany({
    where: { userId, status: CardStatus.MASTERED },
    include: { card: true },
  });

  return progress.map((p) => ({
    hanzi: p.card.hanzi,
    pinyin: p.card.pinyin,
    artiId: p.card.artiId,
  }));
}

/**
 * Ambil kartu MASTERED hanya dari deck yang dipilih user di Settings (targetDeckId).
 * 3 sumber per kind deck:
 *   - HSK      -> Card global via DeckHskCard
 *   - CHUNKING -> DailyTalkCard via DeckChunkCard
 *   - CUSTOM   -> CustomCard milik user
 * Fallback: kalau tidak ada targetDeckId, pakai getMasteredCards (global).
 */
export async function getMasteredCardsForDeck(
  userId: string,
  targetDeckId: string | null
): Promise<MasteredCard[]> {
  if (!targetDeckId) {
    return getMasteredCards(userId);
  }

  const deck = await prisma.deck.findUnique({
    where: { id: targetDeckId },
    select: { id: true, kind: true, userId: true },
  });
  if (!deck || deck.userId !== userId) {
    return getMasteredCards(userId);
  }

  const [hskIds, chunkIds, customIds] = await Promise.all([
    deck.kind === "HSK"
      ? (await prisma.deckHskCard.findMany({ where: { deckId: deck.id }, select: { cardId: true } })).map((r) => r.cardId)
      : Promise.resolve([] as string[]),
    deck.kind === "CHUNKING"
      ? (await prisma.deckChunkCard.findMany({ where: { deckId: deck.id }, select: { dailyTalkCardId: true } })).map((r) => r.dailyTalkCardId)
      : Promise.resolve([] as string[]),
    deck.kind === "CUSTOM"
      ? (await prisma.customCard.findMany({ where: { deckId: deck.id }, select: { id: true } })).map((c) => c.id)
      : Promise.resolve([] as string[]),
  ]);

  const [hskMastered, chunkMastered, customMastered] = await Promise.all([
    hskIds.length > 0
      ? prisma.cardProgress.findMany({
          where: { userId, cardId: { in: hskIds }, status: CardStatus.MASTERED },
          include: { card: true },
        })
      : Promise.resolve([]),
    chunkIds.length > 0
      ? prisma.dailyTalkProgress.findMany({
          where: { userId, dailyTalkCardId: { in: chunkIds }, status: CardStatus.MASTERED },
          include: { dailyTalkCard: true },
        })
      : Promise.resolve([]),
    customIds.length > 0
      ? prisma.customCardProgress.findMany({
          where: { userId, customCardId: { in: customIds }, status: CardStatus.MASTERED },
          include: { customCard: true },
        })
      : Promise.resolve([]),
  ]);

  return [
    ...hskMastered.map((p) => ({ hanzi: p.card.hanzi, pinyin: p.card.pinyin, artiId: p.card.artiId })),
    ...chunkMastered.map((p) => ({ hanzi: p.dailyTalkCard.hanzi, pinyin: p.dailyTalkCard.pinyin, artiId: p.dailyTalkCard.arti })),
    ...customMastered.map((p) => ({ hanzi: p.customCard.hanzi, pinyin: p.customCard.pinyin, artiId: p.customCard.arti })),
  ];
}

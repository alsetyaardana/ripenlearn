// lib/fsrs.ts
// Dipegang oleh: srs-engine-agent (.opencode/agent/srs-engine-agent.md)
// Wrapper di atas ts-fsrs. Lihat AGENTS.md untuk definisi "mastered".

import { fsrs, generatorParameters, Rating, type Card as FsrsCard, createEmptyCard } from "ts-fsrs";

const params = generatorParameters({ enable_fuzz: true });
const scheduler = fsrs(params);

export type ReviewRating = "again" | "hard" | "good" | "easy";

const RATING_MAP: Record<ReviewRating, Rating> = {
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

/**
 * Hitung state kartu baru berdasarkan rating user.
 * TODO(srs-engine-agent): sesuaikan dengan schema CardProgress Prisma (mapping field).
 */
export function scheduleReview(current: FsrsCard, rating: ReviewRating) {
  const result = scheduler.repeat(current, new Date());
  return result[RATING_MAP[rating]];
}

export function newCardState(): FsrsCard {
  return createEmptyCard();
}

/**
 * Ambil daftar kartu mastered milik user — dipakai ai-integration-agent untuk vocab gate.
 * TODO(srs-engine-agent): implementasikan query Prisma sesungguhnya.
 */
export async function getMasteredCards(userId: string) {
  throw new Error("Not implemented — lihat .opencode/agent/srs-engine-agent.md");
}

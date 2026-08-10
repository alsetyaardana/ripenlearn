// lib/review-limit.ts
// Limit kartu baru harian untuk review session — dibaca dari UserSettings per user
// (bukan hardcode). Default 20 untuk user yang belum pernah set. Dipakai endpoint
// /api/review (GET) untuk membatasi jumlah kartu baru yang masuk queue, dan
// dashboard untuk estimasi selesai.
//
// Isolasi: limit selalu di-scope per userId dari session, bukan dari input client.

import type { NormalizedReviewCard } from "./deck";

/** Default kartu baru per hari — dipakai sebelum user menyetel Pengaturan Belajar. */
export const DEFAULT_NEW_CARDS_PER_DAY = 20;

interface PrismaSettingsLike {
  userSettings: {
    findUnique(args: { where: { userId: string } }): Promise<{
      userId: string;
      newCardsPerDay: number;
    } | null>;
  };
}

/**
 * Limit kartu baru harian milik user. Kalau user belum punya setting, kembali ke
 * default 20. Client di-inject supaya bisa di-test tanpa DB live.
 */
export async function getDailyNewCardLimit(
  client: PrismaSettingsLike,
  userId: string
): Promise<number> {
  const row = await client.userSettings.findUnique({ where: { userId } });
  const limit = row?.newCardsPerDay;
  if (typeof limit === "number" && limit >= 1) {
    return Math.floor(limit);
  }
  return DEFAULT_NEW_CARDS_PER_DAY;
}

export interface ReviewQueueResult {
  /** Kartu due (sudah pernah dipelajari, sudah lewat jadwal) — tidak dibatasi. */
  due: NormalizedReviewCard[];
  /** Kartu baru (belum pernah direview) — dipotong sesuai limit harian user. */
  new: NormalizedReviewCard[];
  /** Limit kartu baru harian yang dipakai (dari setting user). */
  newLimit: number;
}

/**
 * Bangun queue review: pisahkan due vs new, lalu batasi jumlah kartu baru dengan
 * limit harian user. Kartu due selalu dimasukkan semua (tidak pernah ditunda).
 */
export async function buildReviewQueue(
  client: PrismaSettingsLike,
  userId: string,
  dueCards: NormalizedReviewCard[],
  newCards: NormalizedReviewCard[]
): Promise<ReviewQueueResult> {
  const newLimit = await getDailyNewCardLimit(client, userId);
  return {
    due: dueCards,
    new: newCards.slice(0, newLimit),
    newLimit,
  };
}

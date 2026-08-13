// lib/settings.ts
// Dipegang oleh: auth-agent (koordinasi db-schema-agent untuk schema UserSettings)
// Pengaturan belajar per user: target HSK, target tanggal selesai, dan kartu baru
// per hari. Dipakai onboarding (first login), menu Pengaturan Belajar, dashboard
// (estimasi selesai), dan endpoint review (limit kartu baru harian).
//
// Aturan isolation: semua fungsi baca/tulis di-scope per userId — user lain tidak
// bisa membaca atau mengubah setting milik orang lain (sesuai pola ownership deck).

import { CardStatus, type PrismaClient } from "@prisma/client";
import { DEFAULT_NEW_CARDS_PER_DAY } from "./review-limit";

export { DEFAULT_NEW_CARDS_PER_DAY, getDailyNewCardLimit } from "./review-limit";

// Batas wajar kartu baru per hari untuk UX beginner (1-100).
export const MIN_NEW_CARDS_PER_DAY = 1;
export const MAX_NEW_CARDS_PER_DAY = 100;

export interface UserSettingsData {
  userId: string;
  targetHskLevel: number | null;
  targetCategory: string | null;
  targetDeckId: string | null;
  targetDate: Date | null;
  targetMode: "DECK" | "CARD";
  newCardsPerDay: number;
}

export const TARGET_CATEGORIES = [
  "daily",
  "food",
  "travel",
  "home",
  "health",
  "money",
  "work",
  "emotion",
  "tech",
  "romance",
] as const;

export type SettingsPayload = {
  targetHskLevel?: unknown;
  targetCategory?: unknown;
  targetDeckId?: unknown;
  targetDate?: unknown;
  targetMode?: unknown;
  newCardsPerDay?: unknown;
};

export type SettingsPayloadResult =
  | { ok: true; value: { targetHskLevel?: number | null; targetCategory?: string | null; targetDeckId?: string | null; targetDate?: Date | null; targetMode?: "DECK" | "CARD"; newCardsPerDay?: number } }
  | { ok: false; error: string };

/** Parsing tanggal YYYY-MM-DD — murni, testable tanpa DB. */
export function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  // Validasi rentang tanggal nyata (menangani 2027-13-40 dkk).
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Validasi payload Pengaturan Belajar. Semua field opsional — payload kosong valid
 * (tidak mengubah apapun). targetHskLevel: integer 1-9. newCardsPerDay: integer
 * 1-100. targetDate: string YYYY-MM-DD yang valid.
 */
export function validateSettingsPayload(body: SettingsPayload): SettingsPayloadResult {
  const value: { targetHskLevel?: number | null; targetCategory?: string | null; targetDeckId?: string | null; targetDate?: Date | null; targetMode?: "DECK" | "CARD"; newCardsPerDay?: number } = {};

  if (body.targetHskLevel !== undefined) {
    const level = body.targetHskLevel;
    if (level === null) {
      value.targetHskLevel = null;
    } else if (typeof level !== "number" || !Number.isInteger(level) || level < 1 || level > 9) {
      return { ok: false, error: "targetHskLevel harus angka bulat 1-9" };
    } else {
      value.targetHskLevel = level;
    }
  }

  if (body.targetDeckId !== undefined) {
    if (body.targetDeckId !== null && typeof body.targetDeckId !== "string") {
      return { ok: false, error: "targetDeckId harus string atau null" };
    }
    value.targetDeckId = body.targetDeckId === null ? null : (body.targetDeckId as string).trim();
  }

  if (body.targetCategory !== undefined) {
    if (body.targetCategory === null) {
      value.targetCategory = null;
    } else if (
      typeof body.targetCategory !== "string" ||
      !(TARGET_CATEGORIES as readonly string[]).includes(body.targetCategory)
    ) {
      return {
        ok: false,
        error: `targetCategory harus salah satu dari: ${TARGET_CATEGORIES.join(", ")}`,
      };
    } else {
      value.targetCategory = body.targetCategory;
    }
  }

  if (body.newCardsPerDay !== undefined) {
    const n = body.newCardsPerDay;
    if (
      typeof n !== "number" ||
      !Number.isInteger(n) ||
      n < MIN_NEW_CARDS_PER_DAY ||
      n > MAX_NEW_CARDS_PER_DAY
    ) {
      return {
        ok: false,
        error: `newCardsPerDay harus angka bulat ${MIN_NEW_CARDS_PER_DAY}-${MAX_NEW_CARDS_PER_DAY}`,
      };
    }
    value.newCardsPerDay = n;
  }

  if (body.targetMode !== undefined) {
    if (body.targetMode !== "DECK" && body.targetMode !== "CARD") {
      return { ok: false, error: "targetMode harus DECK atau CARD" };
    }
    value.targetMode = body.targetMode;
  }

  if (body.targetDate !== undefined) {
    if (body.targetDate === null || body.targetDate === "") {
      // Null atau string kosong = clear target tanggal.
      value.targetDate = null;
    } else if (typeof body.targetDate !== "string") {
      return { ok: false, error: "targetDate harus string YYYY-MM-DD" };
    } else {
      const date = parseDateOnly(body.targetDate);
      if (!date) {
        return { ok: false, error: "targetDate tidak valid (format YYYY-MM-DD)" };
      }
      value.targetDate = date;
    }
  }

  return { ok: true, value };
}

interface PrismaSettingsLike {
  userSettings: {
    findUnique(args: { where: { userId: string } }): Promise<{
      userId: string;
      targetHskLevel: number | null;
      targetCategory: string | null;
      targetDeckId: string | null;
      targetDate: Date | null;
      targetMode: "DECK" | "CARD";
      newCardsPerDay: number;
    } | null>;
    upsert(args: {
      where: { userId: string };
      create: {
        userId: string;
        targetHskLevel?: number | null;
        targetCategory?: string | null;
        targetDeckId?: string | null;
        targetDate?: Date | null;
        targetMode?: "DECK" | "CARD";
        newCardsPerDay?: number;
      };
      update: {
        targetHskLevel?: number | null;
        targetCategory?: string | null;
        targetDeckId?: string | null;
        targetDate?: Date | null;
        targetMode?: "DECK" | "CARD";
        newCardsPerDay?: number;
      };
    }): Promise<{
      userId: string;
      targetHskLevel: number | null;
      targetCategory: string | null;
      targetDeckId: string | null;
      targetDate: Date | null;
      targetMode: "DECK" | "CARD";
      newCardsPerDay: number;
    }>;
  };
}

/** Query tambahan yang dipakai hitung sisa kartu dalam scope target. */
interface PrismaScopeLike {
  card: { count(args: { where: { hskLevel?: number } }): Promise<number> };
  deck: {
    findMany(args: { where: { userId: string }; select: { id: boolean } }): Promise<{ id: string }[]>;
    findUnique(args: {
      where: { id: string };
      select: { kind: boolean; userId: boolean };
    }): Promise<{ kind: "HSK" | "CHUNKING" | "CUSTOM"; userId: string } | null>;
  };
  deckHskCard: {
    findMany(args: {
      where: { deckId: string | { in: string[] } };
      select: { cardId: boolean };
    }): Promise<{ cardId: string }[]>;
  };
  deckChunkCard: {
    findMany(args: {
      where: { deckId: string | { in: string[] } };
      select: { dailyTalkCardId: boolean };
    }): Promise<{ dailyTalkCardId: string }[]>;
  };
  customCard: {
    findMany(args: {
      where: { deckId?: string | { in: string[] }; userId?: string };
      select: { id: boolean };
    }): Promise<{ id: string }[]>;
  };
  cardProgress: {
    count(args: {
      where: {
        userId: string;
        cardId?: { in: string[] };
        card?: { hskLevel?: number };
        status: CardStatus | { in: CardStatus[] } | { not: CardStatus };
      };
    }): Promise<number>;
  };
  dailyTalkProgress: {
    count(args: {
      where: {
        userId: string;
        dailyTalkCardId?: { in: string[] };
        status: CardStatus | { in: CardStatus[] };
      };
    }): Promise<number>;
  };
  customCardProgress: {
    count(args: {
      where: {
        userId: string;
        customCardId?: { in: string[] };
        status: CardStatus | { in: CardStatus[] };
      };
    }): Promise<number>;
  };
}

/**
 * Baca setting belajar user. Kalau user belum pernah set, kembalikan default
 * (target null, newCardsPerDay DEFAULT_NEW_CARDS_PER_DAY). Client di-inject
 * supaya bisa di-test tanpa DB live.
 */
export async function getUserSettings(
  client: PrismaSettingsLike,
  userId: string
): Promise<UserSettingsData> {
  const row = await client.userSettings.findUnique({ where: { userId } });
  if (!row) {
    return {
      userId,
      targetHskLevel: null,
      targetCategory: null,
      targetDeckId: null,
      targetDate: null,
      targetMode: "DECK",
      newCardsPerDay: DEFAULT_NEW_CARDS_PER_DAY,
    };
  }
  return row;
}

/**
 * Apakah user sudah pernah menyimpan setting (melewati onboarding). Row UserSettings
 * yang ada = sudah onboarding; tidak ada = belum (redirect ke /onboarding).
 */
export async function hasUserSettings(
  client: PrismaSettingsLike,
  userId: string
): Promise<boolean> {
  const row = await client.userSettings.findUnique({ where: { userId } });
  return row !== null;
}

/**
 * Update (upsert) setting belajar user. Hanya field yang dikirim yang diubah —
 * field undefined tidak menyentuh nilai yang sudah ada. Field nullable yang
 * dikirim null (atau di-clear dari form) diset NULL eksplisit di upsert update —
 * kalau di-skip, nilai lama akan persist. Isolasi per user: `userId` dari
 * session (server), bukan dari body.
 */
export async function updateUserSettings(
  client: PrismaSettingsLike,
  userId: string,
  data: { targetHskLevel?: number | null; targetCategory?: string | null; targetDeckId?: string | null; targetDate?: Date | null; targetMode?: "DECK" | "CARD"; newCardsPerDay?: number }
): Promise<UserSettingsData> {
  return client.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      targetHskLevel: data.targetHskLevel ?? null,
      targetCategory: data.targetCategory ?? null,
      targetDeckId: data.targetDeckId ?? null,
      targetDate: data.targetDate ?? null,
      targetMode: data.targetMode ?? "DECK",
      newCardsPerDay: data.newCardsPerDay ?? DEFAULT_NEW_CARDS_PER_DAY,
    },
    update: {
      ...(data.targetHskLevel !== undefined ? { targetHskLevel: data.targetHskLevel } : {}),
      ...(data.targetCategory !== undefined ? { targetCategory: data.targetCategory } : {}),
      ...(data.targetDeckId !== undefined ? { targetDeckId: data.targetDeckId } : {}),
      ...(data.targetDate !== undefined ? { targetDate: data.targetDate } : {}),
      ...(data.targetMode !== undefined ? { targetMode: data.targetMode } : {}),
      ...(data.newCardsPerDay !== undefined ? { newCardsPerDay: data.newCardsPerDay } : {}),
    },
  });
}

export interface CompletionEstimate {
  daysRemaining: number;
  estimatedDate: Date;
}

/**
 * Estimasi tanggal selesai berdasarkan total kartu tersisa dan kartu baru per hari.
 * Pembulatan ke atas (ceil) — kalau sisa 21 kartu @ 10/hari, butuh 3 hari.
 * Murni fungsi — tidak menyentuh DB, jadi gampang di-test.
 */
export function estimateCompletionDate(input: {
  totalRemainingCards: number;
  newCardsPerDay: number;
}): CompletionEstimate {
  const perDay = Math.max(1, Math.floor(input.newCardsPerDay));
  const remaining = Math.max(0, Math.floor(input.totalRemainingCards));
  const daysRemaining = Math.ceil(remaining / perDay);

  const estimatedDate = new Date();
  estimatedDate.setHours(0, 0, 0, 0);
  estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);

  return { daysRemaining, estimatedDate };
}

// ============================================================
// Estimasi berbasis TARGET belajar user — bukan semua deck.
//
// Scope target:
//   - targetDeckId diisi  -> hitung hanya kartu di deck itu
//   - targetHskLevel diisi -> hitung hanya kartu di level HSK itu
//   - keduanya kosong      -> semua kartu di deck user (perilaku lama)
//
// Kalau targetDate diisi, dashboard TIDAK memakai newCardsPerDay manual:
// requiredNewCardsPerDay dihitung = sisa kartu / hari tersisa, dan status
// "on-track"/"overdue" ditentukan dari apakah rate itu masih realistis
// (<= MAX_NEW_CARDS_PER_DAY). Tanpa targetDate, manual newCardsPerDay dipakai.
// Kartu mastered/completed tidak pernah dihitung sebagai sisa.
// ============================================================

export type TargetScope =
  | { type: "all" }
  | { type: "hsk"; hskLevel: number }
  | { type: "deck"; deckId: string };

export function getTargetScope(settings: {
  targetHskLevel: number | null;
  targetDeckId: string | null;
}): TargetScope {
  if (settings.targetDeckId) {
    return { type: "deck", deckId: settings.targetDeckId };
  }
  if (settings.targetHskLevel) {
    return { type: "hsk", hskLevel: settings.targetHskLevel };
  }
  return { type: "all" };
}

/** Kartu yang masih harus dikuasai dalam scope target — kartu mastered TIDAK dihitung. */
export async function getRemainingCardsInScope(
  client: PrismaSettingsLike & PrismaScopeLike,
  userId: string,
  scope: TargetScope
): Promise<number> {
  if (scope.type === "hsk") {
    const [inProgress, mastered] = await Promise.all([
      client.cardProgress.count({
        where: {
          userId,
          card: { hskLevel: scope.hskLevel },
          status: { in: [CardStatus.LEARNING, CardStatus.REVIEW] },
        },
      }),
      client.cardProgress.count({
        where: { userId, card: { hskLevel: scope.hskLevel }, status: CardStatus.MASTERED },
      }),
    ]);
    const total = await client.card.count({ where: { hskLevel: scope.hskLevel } });
    return Math.max(0, total - inProgress - mastered);
  }

  if (scope.type === "deck") {
    const deck = await client.deck.findUnique({
      where: { id: scope.deckId },
      select: { kind: true, userId: true },
    });
    // Deck bukan milik user dianggap kosong (tidak bocor data user lain).
    if (!deck || deck.userId !== userId) return 0;

    const [hskIds, chunkIds, customIds] = await Promise.all([
      deck.kind === "HSK"
        ? (
            await client.deckHskCard.findMany({
              where: { deckId: scope.deckId },
              select: { cardId: true },
            })
          ).map((r) => r.cardId)
        : Promise.resolve([] as string[]),
      deck.kind === "CHUNKING"
        ? (
            await client.deckChunkCard.findMany({
              where: { deckId: scope.deckId },
              select: { dailyTalkCardId: true },
            })
          ).map((r) => r.dailyTalkCardId)
        : Promise.resolve([] as string[]),
      deck.kind === "CUSTOM"
        ? (
            await client.customCard.findMany({
              where: { deckId: scope.deckId },
              select: { id: true },
            })
          ).map((c) => c.id)
        : Promise.resolve([] as string[]),
    ]);

    const [hskInProgress, hskMastered, chunkInProgress, chunkMastered, customInProgress, customMastered] =
      await Promise.all([
        hskIds.length > 0
          ? client.cardProgress.count({
              where: { userId, cardId: { in: hskIds }, status: { in: [CardStatus.LEARNING, CardStatus.REVIEW] } },
            })
          : Promise.resolve(0),
        hskIds.length > 0
          ? client.cardProgress.count({
              where: { userId, cardId: { in: hskIds }, status: CardStatus.MASTERED },
            })
          : Promise.resolve(0),
        chunkIds.length > 0
          ? client.dailyTalkProgress.count({
              where: { userId, dailyTalkCardId: { in: chunkIds }, status: { in: [CardStatus.LEARNING, CardStatus.REVIEW] } },
            })
          : Promise.resolve(0),
        chunkIds.length > 0
          ? client.dailyTalkProgress.count({
              where: { userId, dailyTalkCardId: { in: chunkIds }, status: CardStatus.MASTERED },
            })
          : Promise.resolve(0),
        customIds.length > 0
          ? client.customCardProgress.count({
              where: { userId, customCardId: { in: customIds }, status: { in: [CardStatus.LEARNING, CardStatus.REVIEW] } },
            })
          : Promise.resolve(0),
        customIds.length > 0
          ? client.customCardProgress.count({
              where: { userId, customCardId: { in: customIds }, status: CardStatus.MASTERED },
            })
          : Promise.resolve(0),
      ]);

    const total = hskIds.length + chunkIds.length + customIds.length;
    const done = hskInProgress + hskMastered + chunkInProgress + chunkMastered + customInProgress + customMastered;
    return Math.max(0, total - done);
  }

  // scope "all": jumlah kartu di SEMUA deck milik user, minus yang sudah dipelajari/mastered.
  const decks = await client.deck.findMany({ where: { userId }, select: { id: true } });
  const deckIds = decks.map((d) => d.id);
  const [hskIds, chunkIds, customIds] = await Promise.all([
    deckIds.length > 0
      ? (
          await client.deckHskCard.findMany({
            where: { deckId: { in: deckIds } },
            select: { cardId: true },
          })
        ).map((r) => r.cardId)
      : Promise.resolve([] as string[]),
    deckIds.length > 0
      ? (
          await client.deckChunkCard.findMany({
            where: { deckId: { in: deckIds } },
            select: { dailyTalkCardId: true },
          })
        ).map((r) => r.dailyTalkCardId)
      : Promise.resolve([] as string[]),
    deckIds.length > 0
      ? (
          await client.customCard.findMany({
            where: { deckId: { in: deckIds } },
            select: { id: true },
          })
        ).map((c) => c.id)
      : Promise.resolve([] as string[]),
  ]);

  const [hskInProgress, hskMastered, chunkInProgress, chunkMastered, customInProgress, customMastered] =
    await Promise.all([
      hskIds.length > 0
        ? client.cardProgress.count({
            where: { userId, cardId: { in: hskIds }, status: { in: [CardStatus.LEARNING, CardStatus.REVIEW] } },
          })
        : Promise.resolve(0),
      hskIds.length > 0
        ? client.cardProgress.count({
            where: { userId, cardId: { in: hskIds }, status: CardStatus.MASTERED },
          })
        : Promise.resolve(0),
      chunkIds.length > 0
        ? client.dailyTalkProgress.count({
            where: { userId, dailyTalkCardId: { in: chunkIds }, status: { in: [CardStatus.LEARNING, CardStatus.REVIEW] } },
          })
        : Promise.resolve(0),
      chunkIds.length > 0
        ? client.dailyTalkProgress.count({
            where: { userId, dailyTalkCardId: { in: chunkIds }, status: CardStatus.MASTERED },
          })
        : Promise.resolve(0),
      customIds.length > 0
        ? client.customCardProgress.count({
            where: { userId, customCardId: { in: customIds }, status: { in: [CardStatus.LEARNING, CardStatus.REVIEW] } },
          })
        : Promise.resolve(0),
      customIds.length > 0
        ? client.customCardProgress.count({
            where: { userId, customCardId: { in: customIds }, status: CardStatus.MASTERED },
          })
        : Promise.resolve(0),
    ]);

  const total = hskIds.length + chunkIds.length + customIds.length;
  const done = hskInProgress + hskMastered + chunkInProgress + chunkMastered + customInProgress + customMastered;
  return Math.max(0, total - done);
}

/** Dua tanggal date-only (UTC) — berapa hari penuh dari `from` ke `to` (bisa negatif). */
export function daysBetweenDates(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / 86400000);
}

export type EstimateStatus = "on-track" | "overdue";

export interface TargetEstimateResult {
  daysRemaining: number;
  /** Tanggal perkiraan selesai (dari targetDate kalau ada, dari rate kalau manual). */
  estimatedDate: Date;
  /** Kartu baru/hari yang dipakai estimasi — dari targetDate atau manual. */
  effectiveNewCardsPerDay: number;
  /** Kartu baru/hari yang WAJIB kalau mau tepat di targetDate (Infinity kalau overdue). */
  requiredNewCardsPerDay: number;
  status: EstimateStatus;
}

export function estimateCompletionWithSettings(input: {
  totalRemainingCards: number;
  settings: { targetDate: Date | null; newCardsPerDay: number };
  now?: Date;
}): TargetEstimateResult {
  const now = input.now ?? new Date();
  const remaining = Math.max(0, Math.floor(input.totalRemainingCards));
  const manualPerDay = Math.max(1, Math.floor(input.settings.newCardsPerDay));

  if (!input.settings.targetDate) {
    const daysRemaining = Math.ceil(remaining / manualPerDay);
    const estimatedDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysRemaining)
    );
    return {
      daysRemaining,
      estimatedDate,
      effectiveNewCardsPerDay: manualPerDay,
      requiredNewCardsPerDay: manualPerDay,
      status: "on-track",
    };
  }

  const target = input.settings.targetDate;
  const daysRemaining = Math.max(0, daysBetweenDates(now, target));
  const required = remaining > 0 && daysRemaining > 0 ? Math.ceil(remaining / daysRemaining) : 0;

  // Normalisasi target date ke tengah hari UTC — hindari geser satu hari karena timezone.
  const estimatedDate = new Date(target);
  estimatedDate.setUTCHours(12, 0, 0, 0);

  if (remaining > 0 && daysRemaining <= 0) {
    return {
      daysRemaining: 0,
      estimatedDate,
      effectiveNewCardsPerDay: manualPerDay,
      requiredNewCardsPerDay: Number.POSITIVE_INFINITY,
      status: "overdue",
    };
  }

  const realistic = required <= MAX_NEW_CARDS_PER_DAY;
  return {
    daysRemaining,
    estimatedDate,
    effectiveNewCardsPerDay: realistic ? required : manualPerDay,
    requiredNewCardsPerDay: required,
    status: realistic ? "on-track" : "overdue",
  };
}

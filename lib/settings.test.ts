// lib/settings.test.ts
// Test validasi & logic UserSettings: target HSK, target tanggal, kartu baru per
// hari, estimasi tanggal selesai, dan ownership/user isolation. Pakai fake prisma
// (dependency injection) supaya tidak butuh DB live — pola sama dengan lib/deck.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NEW_CARDS_PER_DAY,
  validateSettingsPayload,
  estimateCompletionDate,
  getUserSettings,
  hasUserSettings,
  updateUserSettings,
  getDailyNewCardLimit,
  getTargetScope,
  getRemainingCardsInScope,
  estimateCompletionWithSettings,
} from "./settings";
import type { PrismaClient } from "@prisma/client";
import { CardStatus } from "@prisma/client";

function makeFakePrisma() {
  // userId -> settings row (tanpa join ke User; ownership dimodelkan lewat map ini)
  const settings = new Map<
    string,
    {
      userId: string;
      targetHskLevel: number | null;
      targetCategory: string | null;
      targetDeckId: string | null;
      targetDate: Date | null;
      newCardsPerDay: number;
    }
  >();

  // Data untuk scoped estimate: card global, join deck, customCard, progress.
  const cards = new Map<string, { id: string; hskLevel: number }>();
  const decks = new Map<string, { id: string; userId: string; kind: "HSK" | "CHUNKING" | "CUSTOM" }>();
  const deckHskCards = new Map<string, { deckId: string; cardId: string }>();
  const deckChunkCards = new Map<string, { deckId: string; dailyTalkCardId: string }>();
  const customCards = new Map<string, { id: string; deckId: string; userId: string }>();
  const cardProgress = new Map<string, { userId: string; cardId: string; status: CardStatus }>();
  const dailyTalkProgress = new Map<string, { userId: string; dailyTalkCardId: string; status: CardStatus }>();
  const customCardProgress = new Map<string, { userId: string; customCardId: string; status: CardStatus }>();

  const prisma: unknown = {
    userSettings: {
      async findUnique({ where }: { where: { userId: string } }) {
        return settings.get(where.userId) ?? null;
      },
      async upsert({ where, create, update }: {
        where: { userId: string };
        create: { userId: string; targetHskLevel?: number | null; targetCategory?: string | null; targetDeckId?: string | null; targetDate?: Date | null; newCardsPerDay?: number };
        update: { targetHskLevel?: number | null; targetCategory?: string | null; targetDeckId?: string | null; targetDate?: Date | null; newCardsPerDay?: number };
      }) {
        const existing = settings.get(where.userId);
        const row = {
          userId: where.userId,
          targetHskLevel: existing?.targetHskLevel ?? create.targetHskLevel ?? null,
          targetCategory: existing?.targetCategory ?? create.targetCategory ?? null,
          targetDeckId: existing?.targetDeckId ?? create.targetDeckId ?? null,
          targetDate: existing?.targetDate ?? create.targetDate ?? null,
          newCardsPerDay: existing?.newCardsPerDay ?? create.newCardsPerDay ?? DEFAULT_NEW_CARDS_PER_DAY,
        };
        if (update.targetHskLevel !== undefined) row.targetHskLevel = update.targetHskLevel;
        if (update.targetCategory !== undefined) row.targetCategory = update.targetCategory;
        if (update.targetDeckId !== undefined) row.targetDeckId = update.targetDeckId;
        if (update.targetDate !== undefined) row.targetDate = update.targetDate;
        if (update.newCardsPerDay !== undefined) row.newCardsPerDay = update.newCardsPerDay;
        settings.set(where.userId, row);
        return row;
      },
    },
    card: {
      async count({ where }: { where: { hskLevel?: number } }) {
        if (where.hskLevel === undefined) return cards.size;
        return [...cards.values()].filter((c) => c.hskLevel === where.hskLevel).length;
      },
    },
    deck: {
      async findUnique({ where }: { where: { id: string } }) {
        return decks.get(where.id) ?? null;
      },
      async findMany({ where }: { where: { userId: string } }) {
        return [...decks.values()]
          .filter((d) => d.userId === where.userId)
          .map((d) => ({ id: d.id }));
      },
    },
    deckHskCard: {
      async findMany({ where }: { where: { deckId: string | { in: string[] } } }) {
        const ids = typeof where.deckId === "string" ? [where.deckId] : where.deckId.in;
        return [...deckHskCards.values()]
          .filter((dc) => ids.includes(dc.deckId))
          .map((dc) => ({ cardId: dc.cardId }));
      },
    },
    deckChunkCard: {
      async findMany({ where }: { where: { deckId: string | { in: string[] } } }) {
        const ids = typeof where.deckId === "string" ? [where.deckId] : where.deckId.in;
        return [...deckChunkCards.values()]
          .filter((dc) => ids.includes(dc.deckId))
          .map((dc) => ({ dailyTalkCardId: dc.dailyTalkCardId }));
      },
    },
    customCard: {
      async findMany({ where }: { where: { deckId?: string; userId?: string } }) {
        return [...customCards.values()]
          .filter((cc) => (where.deckId ? cc.deckId === where.deckId : true))
          .filter((cc) => (where.userId ? cc.userId === where.userId : true))
          .map((cc) => ({ id: cc.id }));
      },
    },
    cardProgress: {
      async count({ where }: { where: { userId: string; cardId?: { in: string[] }; card?: { hskLevel?: number }; status: CardStatus | { in: CardStatus[] } | { not: CardStatus } } }) {
        let rows = [...cardProgress.values()].filter((p) => p.userId === where.userId);
        if (where.cardId?.in) rows = rows.filter((p) => where.cardId!.in!.includes(p.cardId));
        if (where.card?.hskLevel !== undefined) {
          const levelCardIds = new Set(
            [...cards.values()].filter((c) => c.hskLevel === where.card!.hskLevel).map((c) => c.id)
          );
          rows = rows.filter((p) => levelCardIds.has(p.cardId));
        }
        if (where.status) {
          const statuses = Array.isArray((where.status as { in?: CardStatus[] }).in)
            ? (where.status as { in: CardStatus[] }).in
            : [(where.status as CardStatus)];
          rows = rows.filter((p) => statuses.includes(p.status));
        }
        return rows.length;
      },
    },
    dailyTalkProgress: {
      async count({ where }: { where: { userId: string; dailyTalkCardId?: { in: string[] }; status: CardStatus | { in: CardStatus[] } } }) {
        let rows = [...dailyTalkProgress.values()].filter((p) => p.userId === where.userId);
        if (where.dailyTalkCardId?.in) rows = rows.filter((p) => where.dailyTalkCardId!.in!.includes(p.dailyTalkCardId));
        if (where.status) {
          const statuses = Array.isArray((where.status as { in?: CardStatus[] }).in)
            ? (where.status as { in: CardStatus[] }).in
            : [(where.status as CardStatus)];
          rows = rows.filter((p) => statuses.includes(p.status));
        }
        return rows.length;
      },
    },
    customCardProgress: {
      async count({ where }: { where: { userId: string; customCardId?: { in: string[] }; status: CardStatus | { in: CardStatus[] } } }) {
        let rows = [...customCardProgress.values()].filter((p) => p.userId === where.userId);
        if (where.customCardId?.in) rows = rows.filter((p) => where.customCardId!.in!.includes(p.customCardId));
        if (where.status) {
          const statuses = Array.isArray((where.status as { in?: CardStatus[] }).in)
            ? (where.status as { in: CardStatus[] }).in
            : [(where.status as CardStatus)];
          rows = rows.filter((p) => statuses.includes(p.status));
        }
        return rows.length;
      },
    },
  };

  return {
    prisma: prisma as PrismaClient,
    _settings: settings,
    _cards: cards,
    _decks: decks,
    _deckHskCards: deckHskCards,
    _deckChunkCards: deckChunkCards,
    _customCards: customCards,
    _cardProgress: cardProgress,
    _dailyTalkProgress: dailyTalkProgress,
    _customCardProgress: customCardProgress,
  };
}

// ============================================================
// validateSettingsPayload — validasi input dari UI Pengaturan Belajar
// ============================================================

test("validateSettingsPayload menerima payload valid lengkap", () => {
  const result = validateSettingsPayload({
    targetHskLevel: 4,
    targetDate: "2027-01-31",
    newCardsPerDay: 15,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.targetHskLevel, 4);
    assert.equal(result.value.newCardsPerDay, 15);
  }
});

test("validateSettingsPayload menerima payload kosong (semua opsional)", () => {
  const result = validateSettingsPayload({});
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.targetHskLevel, undefined);
    assert.equal(result.value.targetDate, undefined);
    assert.equal(result.value.newCardsPerDay, undefined);
  }
});

test("validateSettingsPayload menolak targetHskLevel di luar 1-9", () => {
  assert.equal(validateSettingsPayload({ targetHskLevel: 0 }).ok, false);
  assert.equal(validateSettingsPayload({ targetHskLevel: 10 }).ok, false);
  assert.equal(validateSettingsPayload({ targetHskLevel: 4.5 }).ok, false);
  assert.equal(validateSettingsPayload({ targetHskLevel: "4" }).ok, false);
});

test("validateSettingsPayload menolak newCardsPerDay di luar 1-100", () => {
  assert.equal(validateSettingsPayload({ newCardsPerDay: 0 }).ok, false);
  assert.equal(validateSettingsPayload({ newCardsPerDay: 101 }).ok, false);
  assert.equal(validateSettingsPayload({ newCardsPerDay: 2.5 }).ok, false);
  assert.equal(validateSettingsPayload({ newCardsPerDay: "20" }).ok, false);
});

test("validateSettingsPayload menolak targetDate bukan tanggal valid", () => {
  assert.equal(validateSettingsPayload({ targetDate: "bukan-tanggal" }).ok, false);
  assert.equal(validateSettingsPayload({ targetDate: "2027-13-40" }).ok, false);
});

test("validateSettingsPayload menerima null untuk field nullable (clear)", () => {
  const result = validateSettingsPayload({
    targetHskLevel: null,
    targetCategory: null,
    targetDeckId: null,
    targetDate: null,
    newCardsPerDay: 15,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.targetHskLevel, null);
    assert.equal(result.value.targetDeckId, null);
    assert.equal(result.value.targetDate, null);
    assert.equal(result.value.newCardsPerDay, 15);
  }
});

test("validateSettingsPayload menerima string kosong untuk targetDate (di-clear dari form)", () => {
  // Form date input kosong -> "" (bukan null). Harus diperlakukan sebagai clear.
  const result = validateSettingsPayload({ targetDate: "" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.targetDate, null);
  }
});

test("validateSettingsPayload menerima targetCategory valid", () => {
  for (const cat of ["daily", "tech", "romance"]) {
    const result = validateSettingsPayload({ targetCategory: cat });
    assert.equal(result.ok, true, `${cat} harus valid`);
    if (result.ok) {
      assert.equal(result.value.targetCategory, cat);
    }
  }
});

test("validateSettingsPayload menerima targetCategory null (clear)", () => {
  const result = validateSettingsPayload({ targetCategory: null });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.targetCategory, null);
  }
});

test("validateSettingsPayload menolak targetCategory di luar daftar", () => {
  assert.equal(validateSettingsPayload({ targetCategory: "travel" }).ok, false);
  assert.equal(validateSettingsPayload({ targetCategory: 42 }).ok, false);
  assert.equal(validateSettingsPayload({ targetCategory: { x: 1 } }).ok, false);
});

// ============================================================
// getUserSettings — default saat belum pernah set
// ============================================================

test("getUserSettings mengembalikan default kalau user belum punya settings", async () => {
  const { prisma } = makeFakePrisma();
  const settings = await getUserSettings(prisma, "user-1");
  assert.equal(settings.newCardsPerDay, DEFAULT_NEW_CARDS_PER_DAY);
  assert.equal(settings.targetHskLevel, null);
  assert.equal(settings.targetDate, null);
});

test("getUserSettings mengembalikan setting milik user (user isolation)", async () => {
  const { prisma, _settings } = makeFakePrisma();
  _settings.set("user-1", {
    userId: "user-1",
    targetHskLevel: 3,
    targetCategory: null,
    targetDeckId: null,
    targetDate: null,
    newCardsPerDay: 10,
  });
  _settings.set("user-2", {
    userId: "user-2",
    targetHskLevel: 5,
    targetCategory: null,
    targetDeckId: null,
    targetDate: new Date("2027-06-30"),
    newCardsPerDay: 30,
  });

  const s1 = await getUserSettings(prisma, "user-1");
  const s2 = await getUserSettings(prisma, "user-2");

  assert.equal(s1.newCardsPerDay, 10);
  assert.equal(s1.targetHskLevel, 3);
  assert.equal(s2.newCardsPerDay, 30);
  assert.equal(s2.targetHskLevel, 5);
  assert.equal(s2.targetDate?.getTime(), new Date("2027-06-30").getTime());
});

// ============================================================
// hasUserSettings — penanda onboarding (first login)
// ============================================================

test("hasUserSettings false kalau user belum pernah simpan setting", async () => {
  const { prisma } = makeFakePrisma();
  assert.equal(await hasUserSettings(prisma, "user-baru"), false);
});

test("hasUserSettings true kalau user sudah simpan setting", async () => {
  const { prisma, _settings } = makeFakePrisma();
  _settings.set("user-1", {
    userId: "user-1",
    targetHskLevel: 3,
    targetCategory: null,
    targetDeckId: null,
    targetDate: null,
    newCardsPerDay: 10,
  });
  assert.equal(await hasUserSettings(prisma, "user-1"), true);
});

test("hasUserSettings isolasi antar user", async () => {
  const { prisma, _settings } = makeFakePrisma();
  _settings.set("user-1", {
    userId: "user-1",
    targetHskLevel: 3,
    targetCategory: null,
    targetDeckId: null,
    targetDate: null,
    newCardsPerDay: 10,
  });
  assert.equal(await hasUserSettings(prisma, "user-1"), true);
  assert.equal(await hasUserSettings(prisma, "user-2"), false);
});

// ============================================================
// updateUserSettings — upsert per user, isolasi antar user
// ============================================================

test("updateUserSettings membuat setting baru (upsert create) untuk user", async () => {
  const { prisma, _settings } = makeFakePrisma();
  const updated = await updateUserSettings(prisma, "user-1", {
    targetHskLevel: 4,
    newCardsPerDay: 15,
  });
  assert.equal(updated.newCardsPerDay, 15);
  assert.equal(_settings.get("user-1")?.targetHskLevel, 4);
  assert.equal(_settings.size, 1, "hanya satu user yang dibuat");
});

test("updateUserSettings mengubah setting user lain tidak terpengaruh", async () => {
  const { prisma, _settings } = makeFakePrisma();
  _settings.set("user-1", {
    userId: "user-1",
    targetHskLevel: 3,
    targetCategory: null,
    targetDeckId: null,
    targetDate: null,
    newCardsPerDay: 10,
  });
  _settings.set("user-2", {
    userId: "user-2",
    targetHskLevel: 5,
    targetCategory: null,
    targetDeckId: null,
    targetDate: null,
    newCardsPerDay: 30,
  });

  await updateUserSettings(prisma, "user-1", { newCardsPerDay: 25 });

  assert.equal(_settings.get("user-1")?.newCardsPerDay, 25, "user-1 terupdate");
  assert.equal(_settings.get("user-2")?.newCardsPerDay, 30, "user-2 tidak berubah");
});

// ============================================================
// Clearing nullable fields — targetHskLevel / targetDeckId / targetDate
// yang dikirim null harus benar-benar diset NULL di DB (upsert update),
// bukan di-skip. Ini bug yang dilaporkan user: targetDate masih persist
// setelah dikosongkan (hanya newCardsPerDay yang diubah).
// ============================================================

test("updateUserSettings: targetDate dikirim null -> tersimpan NULL (clear)", async () => {
  const { prisma, _settings } = makeFakePrisma();
  _settings.set("user-1", {
    userId: "user-1",
    targetHskLevel: null,
    targetCategory: null,
    targetDeckId: null,
    targetDate: new Date("2027-06-30"),
    newCardsPerDay: 10,
  });

  const updated = await updateUserSettings(prisma, "user-1", { targetDate: null, newCardsPerDay: 15 });

  assert.equal(updated.targetDate, null, "targetDate harus NULL setelah di-clear");
  assert.equal(_settings.get("user-1")?.targetDate, null, "row di DB harus NULL");
  assert.equal(_settings.get("user-1")?.newCardsPerDay, 15, "newCardsPerDay tetap ikut tersimpan");
});

test("updateUserSettings: targetHskLevel dikirim null -> tersimpan NULL (clear)", async () => {
  const { prisma, _settings } = makeFakePrisma();
  _settings.set("user-1", {
    userId: "user-1",
    targetHskLevel: 4,
    targetCategory: null,
    targetDeckId: null,
    targetDate: null,
    newCardsPerDay: 10,
  });

  const updated = await updateUserSettings(prisma, "user-1", { targetHskLevel: null });

  assert.equal(updated.targetHskLevel, null);
  assert.equal(_settings.get("user-1")?.targetHskLevel, null);
});

test("updateUserSettings: targetDeckId dikirim null -> tersimpan NULL (clear)", async () => {
  const { prisma, _settings } = makeFakePrisma();
  _settings.set("user-1", {
    userId: "user-1",
    targetHskLevel: null,
    targetCategory: null,
    targetDeckId: "deck-1",
    targetDate: null,
    newCardsPerDay: 10,
  });

  const updated = await updateUserSettings(prisma, "user-1", { targetDeckId: null });

  assert.equal(updated.targetDeckId, null);
  assert.equal(_settings.get("user-1")?.targetDeckId, null);
});

test("updateUserSettings: targetCategory dikirim -> tersimpan, dan null -> clear", async () => {
  const { prisma, _settings } = makeFakePrisma();
  const withCat = await updateUserSettings(prisma, "user-1", { targetCategory: "daily" });
  assert.equal(withCat.targetCategory, "daily");
  assert.equal(_settings.get("user-1")?.targetCategory, "daily");

  const cleared = await updateUserSettings(prisma, "user-1", { targetCategory: null });
  assert.equal(cleared.targetCategory, null);
  assert.equal(_settings.get("user-1")?.targetCategory, null);
});

test("updateUserSettings: field di-clear tidak mempengaruhi field lain", async () => {
  const { prisma, _settings } = makeFakePrisma();
  _settings.set("user-1", {
    userId: "user-1",
    targetHskLevel: 4,
    targetCategory: null,
    targetDeckId: "deck-1",
    targetDate: new Date("2027-06-30"),
    newCardsPerDay: 10,
  });

  await updateUserSettings(prisma, "user-1", { targetDate: null });

  const row = _settings.get("user-1")!;
  assert.equal(row.targetDate, null, "hanya targetDate yang di-clear");
  assert.equal(row.targetHskLevel, 4, "targetHskLevel tidak berubah");
  assert.equal(row.targetDeckId, "deck-1", "targetDeckId tidak berubah");
  assert.equal(row.newCardsPerDay, 10, "newCardsPerDay tidak berubah");
});

// ============================================================
// estimateCompletionDate — estimasi tanggal selesai
// ============================================================

test("estimateCompletionDate: total 100 kartu, 20/hari -> 5 hari", () => {
  const result = estimateCompletionDate({ totalRemainingCards: 100, newCardsPerDay: 20 });
  assert.equal(result.daysRemaining, 5);
  assert.ok(result.estimatedDate > new Date());
});

test("estimateCompletionDate: total 0 kartu -> selesai sekarang", () => {
  const result = estimateCompletionDate({ totalRemainingCards: 0, newCardsPerDay: 20 });
  assert.equal(result.daysRemaining, 0);
});

test("estimateCompletionDate: sisa kartu dibagi kartu per hari (ceil)", () => {
  // 21 kartu @ 10/hari -> 3 hari (2.1 -> ceil 3)
  const result = estimateCompletionDate({ totalRemainingCards: 21, newCardsPerDay: 10 });
  assert.equal(result.daysRemaining, 3);
});

test("estimateCompletionDate: estimasi memakai tanggal dari hari ini", () => {
  const before = new Date();
  const result = estimateCompletionDate({ totalRemainingCards: 50, newCardsPerDay: 10 });
  const expected = new Date();
  expected.setDate(expected.getDate() + 5);
  expected.setHours(0, 0, 0, 0);
  // estimasi harus berada di sekitar hari ini + daysRemaining (toleransi karena jam)
  assert.ok(result.estimatedDate.getTime() >= before.getTime() - 86400000);
  assert.equal(
    result.estimatedDate.toDateString(),
    expected.toDateString(),
    "tanggal estimasi = hari ini + daysRemaining"
  );
});

// ============================================================
// getDailyNewCardLimit — limit kartu baru harian dari setting
// ============================================================

test("getDailyNewCardLimit memakai setting user, bukan hardcode", async () => {
  const { prisma, _settings } = makeFakePrisma();
  _settings.set("user-1", {
    userId: "user-1",
    targetHskLevel: null,
    targetCategory: null,
    targetDeckId: null,
    targetDate: null,
    newCardsPerDay: 7,
  });

  const limit = await getDailyNewCardLimit(prisma, "user-1");
  assert.equal(limit, 7);
});

test("getDailyNewCardLimit default 20 kalau user belum set", async () => {
  const { prisma } = makeFakePrisma();
  const limit = await getDailyNewCardLimit(prisma, "user-9");
  assert.equal(limit, DEFAULT_NEW_CARDS_PER_DAY);
});

test("getDailyNewCardLimit user isolation: limit user lain tidak bocor", async () => {
  const { prisma, _settings } = makeFakePrisma();
  _settings.set("user-1", { userId: "user-1", targetHskLevel: null, targetCategory: null, targetDeckId: null, targetDate: null, newCardsPerDay: 5 });
  _settings.set("user-2", { userId: "user-2", targetHskLevel: null, targetCategory: null, targetDeckId: null, targetDate: null, newCardsPerDay: 40 });

  assert.equal(await getDailyNewCardLimit(prisma, "user-1"), 5);
  assert.equal(await getDailyNewCardLimit(prisma, "user-2"), 40);
});

// ============================================================
// getTargetScope — scope estimasi mengikuti target belajar user
// ============================================================

test("getTargetScope: memakai targetHskLevel kalau targetDeckId null", () => {
  assert.deepEqual(getTargetScope({ targetHskLevel: 3, targetDeckId: null }), { type: "hsk", hskLevel: 3 });
  assert.deepEqual(getTargetScope({ targetHskLevel: null, targetDeckId: null }), { type: "all" });
});

test("getTargetScope: targetDeckId menang atas targetHskLevel", () => {
  assert.deepEqual(getTargetScope({ targetHskLevel: 3, targetDeckId: "deck-1" }), { type: "deck", deckId: "deck-1" });
});

// ============================================================
// getRemainingCardsInScope — count sisa kartu TARGET (bukan semua deck),
// tidak pernah menghitung kartu mastered/completed sebagai sisa
// ============================================================

test("getRemainingCardsInScope: target HSK hanya menghitung kartu level itu", async () => {
  const { prisma } = makeFakePrisma();
  const remaining = await getRemainingCardsInScope(prisma, "user-1", { type: "hsk", hskLevel: 3 });
  assert.equal(remaining, 0);
});

test("getRemainingCardsInScope: deck-scope hanya menghitung kartu di deck itu (bukan semua deck)", async () => {
  const { prisma } = makeFakePrisma();
  const remaining = await getRemainingCardsInScope(prisma, "user-1", { type: "deck", deckId: "deck-a" });
  assert.equal(remaining, 0);
});

// ============================================================
// estimateCompletionWithSettings — target-date: auto daily rate, countdown,
// status on track / overdue. Tanpa target date: pakai manual newCardsPerDay.
// ============================================================

test("estimateCompletionWithSettings: manual newCardsPerDay dipakai kalau tidak ada target date", () => {
  const result = estimateCompletionWithSettings({
    totalRemainingCards: 100,
    settings: { targetDate: null, newCardsPerDay: 20 },
    now: new Date("2026-08-03T00:00:00Z"),
  });
  assert.equal(result.daysRemaining, 5);
  assert.equal(result.requiredNewCardsPerDay, 20);
  assert.equal(result.estimatedDate.toISOString().slice(0, 10), "2026-08-08");
  assert.equal(result.status, "on-track");
});

test("estimateCompletionWithSettings: target date menghitung hari tersisa & required daily rate", () => {
  const result = estimateCompletionWithSettings({
    totalRemainingCards: 100,
    settings: { targetDate: new Date("2026-08-13T00:00:00Z"), newCardsPerDay: 20 },
    now: new Date("2026-08-03T00:00:00Z"),
  });
  assert.equal(result.daysRemaining, 10);
  assert.equal(result.requiredNewCardsPerDay, 10, "100 kartu / 10 hari = 10/hari");
  assert.equal(result.estimatedDate.toISOString().slice(0, 10), "2026-08-13");
  assert.equal(result.status, "on-track");
});

test("estimateCompletionWithSettings: target date sudah lewat (overdue) -> status overdue", () => {
  const result = estimateCompletionWithSettings({
    totalRemainingCards: 50,
    settings: { targetDate: new Date("2026-07-30T00:00:00Z"), newCardsPerDay: 20 },
    now: new Date("2026-08-03T00:00:00Z"),
  });
  assert.equal(result.status, "overdue");
  assert.equal(result.daysRemaining, 0, "tidak ada waktu tersisa");
  assert.equal(result.requiredNewCardsPerDay, Infinity, "rate tidak mungkin dicapai");
});

test("estimateCompletionWithSettings: rate wajib > 100 (tidak realistis) -> status overdue", () => {
  const result = estimateCompletionWithSettings({
    totalRemainingCards: 500,
    settings: { targetDate: new Date("2026-08-05T00:00:00Z"), newCardsPerDay: 20 },
    now: new Date("2026-08-03T00:00:00Z"),
  });
  assert.equal(result.status, "overdue");
  assert.equal(result.requiredNewCardsPerDay, 250, "500 / 2 hari");
  assert.ok(result.requiredNewCardsPerDay > 100, "rate melebihi batas wajar MAX_NEW_CARDS_PER_DAY");
});

test("estimateCompletionWithSettings: target tanggal hari ini -> 0 hari tersisa, selesai sekarang", () => {
  const result = estimateCompletionWithSettings({
    totalRemainingCards: 0,
    settings: { targetDate: new Date("2026-08-03T00:00:00Z"), newCardsPerDay: 20 },
    now: new Date("2026-08-03T00:00:00Z"),
  });
  assert.equal(result.status, "on-track");
  assert.equal(result.daysRemaining, 0);
  assert.equal(result.estimatedDate.toISOString().slice(0, 10), "2026-08-03");
});

// lib/deck.test.ts
// Test ownership & operasi deck. Pakai fake prisma (dependency injection) supaya
// tidak butuh database live — fokus logic ownership, bukan integrasi DB.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertDeckOwnership,
  addGlobalCardsToDeck,
  deleteDeck,
  addHskLevelToDeck,
  addCategoryToDeck,
  getCardCountsByHskLevel,
  getDeckCardCountsByHskLevel,
  getDeckCardCountsByCategory,
  getDeckCurriculumKind,
  DeckNotFoundError,
} from "./deck";
import type { PrismaClient } from "@prisma/client";

// Fake prisma yang memodelkan minimal data deck milik dua user, plus Card global
// (untuk bulk add per level) dan deck.delete (untuk deleteDeck).
// Model 2026-08: deck.kind menentukan sumber kartu —
//   HSK      -> DeckHskCard -> Card global (level 1-7)
//   CHUNKING -> DeckChunkCard -> DailyTalkCard (kategori tema)
//   CUSTOM   -> CustomCard scoped ke deck
function makeFakePrisma() {
  const decks = new Map<string, { id: string; userId: string; kind: "HSK" | "CHUNKING" | "CUSTOM" }>();
  const deckHskCards = new Map<string, { deckId: string; cardId: string }>();
  const deckChunkCards = new Map<string, { deckId: string; dailyTalkCardId: string }>();
  const cards = new Map<string, { id: string; hskLevel: number }>();
  const dailyTalkCards = new Map<string, { id: string; category: string }>();

  const prisma: unknown = {
    deck: {
      async findUnique({ where, select }: { where: { id: string }; select?: { kind?: boolean } }) {
        const deck = decks.get(where.id) ?? null;
        if (deck && select) {
          const picked: Record<string, unknown> = {};
          if (select.kind) picked.kind = deck.kind;
          return picked;
        }
        return deck;
      },
      async delete({ where }: { where: { id: string } }) {
        const deck = decks.get(where.id);
        if (!deck) return null;
        decks.delete(where.id);
        for (const key of [...deckHskCards.keys()]) {
          if (key.startsWith(`${where.id}:`)) deckHskCards.delete(key);
        }
        for (const key of [...deckChunkCards.keys()]) {
          if (key.startsWith(`${where.id}:`)) deckChunkCards.delete(key);
        }
        return deck;
      },
    },
    deckHskCard: {
      async createMany({ data, skipDuplicates }: { data: { deckId: string; cardId: string }[]; skipDuplicates?: boolean }) {
        let count = 0;
        for (const row of data) {
          const key = `${row.deckId}:${row.cardId}`;
          if (skipDuplicates && deckHskCards.has(key)) continue;
          deckHskCards.set(key, row);
          count++;
        }
        return { count };
      },
    },
    deckChunkCard: {
      async findMany({ where, select }: { where: { deckId: string }; select?: { dailyTalkCardId?: boolean } }) {
        const rows = [...deckChunkCards.values()].filter((dc) => dc.deckId === where.deckId);
        if (select) return rows.map((r) => ({ dailyTalkCardId: r.dailyTalkCardId }));
        return rows;
      },
      async createMany({ data, skipDuplicates }: { data: { deckId: string; dailyTalkCardId: string }[]; skipDuplicates?: boolean }) {
        let count = 0;
        for (const row of data) {
          const key = `${row.deckId}:${row.dailyTalkCardId}`;
          if (skipDuplicates && deckChunkCards.has(key)) continue;
          deckChunkCards.set(key, row);
          count++;
        }
        return { count };
      },
    },
    card: {
      async findMany({ where }: { where: { hskLevel?: { in?: number[] } | number } }) {
        const levels =
          typeof where.hskLevel === "number"
            ? [where.hskLevel]
            : (where.hskLevel?.in ?? null);
        return [...cards.values()]
          .filter((c) => (levels === null ? true : levels.includes(c.hskLevel)))
          .map((c) => ({ id: c.id }));
      },
      async groupBy({ by, where, _count, orderBy }: { by: string[]; where?: { hskLevel?: number | { not: number } | { in: number[] }; deckHskCards?: { none: { deckId: string } } }; _count: { _all: true }; orderBy: { hskLevel: "asc" | "desc" } }) {
        const levels =
          typeof where?.hskLevel === "object" && !("not" in where.hskLevel)
            ? (where.hskLevel as { in: number[] }).in
            : null;
        const excluded = typeof where?.hskLevel === "object" && "not" in where.hskLevel ? where.hskLevel.not : undefined;
        const deckId = where?.deckHskCards?.none?.deckId;
        const inDeck = new Set(
          deckId === undefined ? [] : [...deckHskCards.values()].filter((dc) => dc.deckId === deckId).map((dc) => dc.cardId)
        );
        const rows = [...cards.values()].filter(
          (c) =>
            (levels === null ||
              typeof where?.hskLevel === "number" ||
              where?.hskLevel === undefined
              ? typeof where?.hskLevel === "number"
                ? c.hskLevel === where.hskLevel
                : true
              : levels.includes(c.hskLevel)) &&
            (excluded === undefined || c.hskLevel !== excluded) &&
            (deckId === undefined || !inDeck.has(c.id))
        );
        const counts = new Map<number, number>();
        for (const c of rows) counts.set(c.hskLevel, (counts.get(c.hskLevel) ?? 0) + 1);
        const order = orderBy.hskLevel === "desc" ? -1 : 1;
        return [...counts.entries()]
          .sort((a, b) => (a[0] - b[0]) * order)
          .map(([hskLevel, count]) => ({ hskLevel, _count: { _all: count } }));
      },
    },
    dailyTalkCard: {
      async findMany({ where }: { where?: { category?: string } }) {
        return [...dailyTalkCards.values()]
          .filter((c) => where?.category === undefined || c.category === where.category)
          .map((c) => ({ id: c.id, category: c.category }));
      },
    },
    // dipakai fungsi lain kalau di-test, minimal tidak error
    customCard: {
      async create(_args: unknown) {
        return { id: "cc-1" };
      },
    },
  };

  return {
    prisma: prisma as PrismaClient,
    _decks: decks,
    _deckHskCards: deckHskCards,
    _deckChunkCards: deckChunkCards,
    _cards: cards,
    _dailyTalkCards: dailyTalkCards,
  };
}

test("assertDeckOwnership mengizinkan pemilik deck", async () => {
  const { prisma, _decks } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "CUSTOM" });

  // Harus resolve tanpa throw untuk pemilik.
  await assertDeckOwnership(prisma, "deck-a", "user-1");
});

test("assertDeckOwnership menolak non-pemilik (tidak membocorkan metadata)", async () => {
  const { prisma, _decks } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "CUSTOM" });

  await assert.rejects(
    () => assertDeckOwnership(prisma, "deck-a", "user-2"),
    /not found|forbidden/i
  );
});

test("assertDeckOwnership menolak deck yang tidak ada", async () => {
  const { prisma } = makeFakePrisma();

  await assert.rejects(() => assertDeckOwnership(prisma, "deck-gone", "user-1"));
});

test("addGlobalCardsToDeck menolak menambah card ke deck milik user lain", async () => {
  const { prisma, _decks } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });

  await assert.rejects(
    () => addGlobalCardsToDeck(prisma, "deck-a", "user-2", ["card-1"]),
    /not found|forbidden/i
  );
});

test("addGlobalCardsToDeck menambah card untuk pemilik deck", async () => {
  const { prisma, _decks, _deckHskCards } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });

  await addGlobalCardsToDeck(prisma, "deck-a", "user-1", ["card-1", "card-2"]);

  assert.equal(_deckHskCards.has("deck-a:card-1"), true);
  assert.equal(_deckHskCards.has("deck-a:card-2"), true);
});

// ============================================================
// deleteDeck — owner-safe delete
// ============================================================

test("deleteDeck menghapus deck untuk pemilik", async () => {
  const { prisma, _decks, _deckHskCards, _deckChunkCards } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });
  _deckHskCards.set("deck-a:card-1", { deckId: "deck-a", cardId: "card-1" });
  _deckChunkCards.set("deck-a:chunk-1", { deckId: "deck-a", dailyTalkCardId: "chunk-1" });

  await deleteDeck(prisma, "deck-a", "user-1");

  assert.equal(_decks.has("deck-a"), false, "deck pemilik harus terhapus");
  assert.equal(_deckHskCards.has("deck-a:card-1"), false, "DeckHskCard ikut terhapus (cascade)");
  assert.equal(_deckChunkCards.has("deck-a:chunk-1"), false, "DeckChunkCard ikut terhapus (cascade)");
});

test("deleteDeck menolak non-pemilik (tidak membocorkan metadata)", async () => {
  const { prisma, _decks } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "CUSTOM" });

  await assert.rejects(
    () => deleteDeck(prisma, "deck-a", "user-2"),
    (err: unknown) => err instanceof DeckNotFoundError
  );
  assert.equal(_decks.has("deck-a"), true, "deck user lain tidak boleh terhapus");
});

test("deleteDeck menolak deck yang tidak ada", async () => {
  const { prisma } = makeFakePrisma();

  await assert.rejects(
    () => deleteDeck(prisma, "deck-gone", "user-1"),
    (err: unknown) => err instanceof DeckNotFoundError
  );
});

// ============================================================
// addHskLevelToDeck — bulk add per level, idempotent
// ============================================================

function seedCard(cards: Map<string, { id: string; hskLevel: number }>, id: string, hskLevel: number) {
  cards.set(id, { id, hskLevel });
}

function seedDailyTalkCard(
  cards: Map<string, { id: string; category: string }>,
  id: string,
  category: string
) {
  cards.set(id, { id, category });
}

test("addHskLevelToDeck menambah semua card di level untuk pemilik", async () => {
  const { prisma, _decks, _deckHskCards, _cards } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });
  seedCard(_cards, "c1", 1);
  seedCard(_cards, "c2", 1);
  seedCard(_cards, "c3", 2);

  const result = await addHskLevelToDeck(prisma, "deck-a", "user-1", [1]);

  assert.equal(result.added, 2);
  assert.equal(_deckHskCards.has("deck-a:c1"), true);
  assert.equal(_deckHskCards.has("deck-a:c2"), true);
  assert.equal(_deckHskCards.has("deck-a:c3"), false, "card level lain tidak ikut");
});

test("addHskLevelToDeck mendukung beberapa level sekaligus", async () => {
  const { prisma, _decks, _deckHskCards, _cards } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });
  seedCard(_cards, "c1", 1);
  seedCard(_cards, "c2", 2);
  seedCard(_cards, "c3", 3);

  const result = await addHskLevelToDeck(prisma, "deck-a", "user-1", [1, 2]);

  assert.equal(result.added, 2);
  assert.equal(_deckHskCards.has("deck-a:c1"), true);
  assert.equal(_deckHskCards.has("deck-a:c2"), true);
  assert.equal(_deckHskCards.has("deck-a:c3"), false);
});

test("addHskLevelToDeck idempotent — pemanggilan kedua tidak menambah duplikat", async () => {
  const { prisma, _decks, _deckHskCards, _cards } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });
  seedCard(_cards, "c1", 1);

  await addHskLevelToDeck(prisma, "deck-a", "user-1", [1]);
  const again = await addHskLevelToDeck(prisma, "deck-a", "user-1", [1]);

  assert.equal(again.added, 1);
  assert.equal(_deckHskCards.size, 1, "tidak boleh ada baris DeckHskCard duplikat");
  assert.equal(_deckHskCards.has("deck-a:c1"), true);
});

test("addHskLevelToDeck menolak non-pemilik", async () => {
  const { prisma, _decks } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });

  await assert.rejects(
    () => addHskLevelToDeck(prisma, "deck-a", "user-2", [1]),
    (err: unknown) => err instanceof DeckNotFoundError
  );
});

test("addHskLevelToDeck level tanpa card — no-op, added 0", async () => {
  const { prisma, _decks, _deckHskCards } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });

  const result = await addHskLevelToDeck(prisma, "deck-a", "user-1", [9]);

  assert.equal(result.added, 0);
  assert.equal(_deckHskCards.size, 0);
});

// ============================================================
// getCardCountsByHskLevel — jumlah card per level
// ============================================================

test("getCardCountsByHskLevel mengembalikan count per level yang punya card", async () => {
  const { prisma, _cards } = makeFakePrisma();
  seedCard(_cards, "c1", 1);
  seedCard(_cards, "c2", 1);
  seedCard(_cards, "c3", 3);

  const counts = await getCardCountsByHskLevel(prisma);

  assert.deepEqual(counts, [
    { level: 1, count: 2 },
    { level: 3, count: 1 },
  ]);
});

test("getCardCountsByHskLevel mengembalikan [] kalau tidak ada card", async () => {
  const { prisma } = makeFakePrisma();

  const counts = await getCardCountsByHskLevel(prisma);

  assert.deepEqual(counts, []);
});

// ============================================================
// addCategoryToDeck — bulk add per kategori (Daily Talk), idempotent
// ============================================================

test("addCategoryToDeck menambah semua card di kategori untuk pemilik", async () => {
  const { prisma, _decks, _deckChunkCards, _dailyTalkCards } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "CHUNKING" });
  seedDailyTalkCard(_dailyTalkCards, "d1", "daily");
  seedDailyTalkCard(_dailyTalkCards, "d2", "daily");
  seedDailyTalkCard(_dailyTalkCards, "d3", "tech");

  const result = await addCategoryToDeck(prisma, "deck-a", "user-1", "daily");

  assert.equal(result.added, 2);
  assert.equal(_deckChunkCards.has("deck-a:d1"), true);
  assert.equal(_deckChunkCards.has("deck-a:d2"), true);
  assert.equal(_deckChunkCards.has("deck-a:d3"), false, "card kategori lain tidak ikut");
});

test("addCategoryToDeck idempotent — pemanggilan kedua tidak menambah duplikat", async () => {
  const { prisma, _decks, _deckChunkCards, _dailyTalkCards } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "CHUNKING" });
  seedDailyTalkCard(_dailyTalkCards, "d1", "daily");

  await addCategoryToDeck(prisma, "deck-a", "user-1", "daily");
  const again = await addCategoryToDeck(prisma, "deck-a", "user-1", "daily");

  assert.equal(again.added, 1);
  assert.equal(_deckChunkCards.size, 1, "tidak boleh ada baris DeckChunkCard duplikat");
});

test("addCategoryToDeck menolak non-pemilik", async () => {
  const { prisma, _decks } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "CHUNKING" });

  await assert.rejects(
    () => addCategoryToDeck(prisma, "deck-a", "user-2", "daily"),
    (err: unknown) => err instanceof DeckNotFoundError
  );
});

test("addCategoryToDeck kategori tanpa card — no-op, added 0", async () => {
  const { prisma, _decks, _deckChunkCards } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "CHUNKING" });

  const result = await addCategoryToDeck(prisma, "deck-a", "user-1", "romance");

  assert.equal(result.added, 0);
  assert.equal(_deckChunkCards.size, 0);
});

// ============================================================
// getDeckCardCountsByHskLevel — jumlah card per level yang BELUM ada di deck
// ============================================================

test("getDeckCardCountsByHskLevel mengembalikan count per level yang belum ada di deck", async () => {
  const { prisma, _decks, _deckHskCards, _cards } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });
  seedCard(_cards, "c1", 1);
  seedCard(_cards, "c2", 1);
  seedCard(_cards, "c3", 2);
  _deckHskCards.set("deck-a:c1", { deckId: "deck-a", cardId: "c1" });

  const counts = await getDeckCardCountsByHskLevel(prisma, "deck-a");

  assert.deepEqual(counts, [
    { level: 1, count: 1 }, // c1 sudah ada di deck, tidak dihitung
    { level: 2, count: 1 },
  ]);
});

test("getDeckCardCountsByHskLevel tidak menghitung card deck lain", async () => {
  const { prisma, _decks, _deckHskCards, _cards } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });
  _decks.set("deck-b", { id: "deck-b", userId: "user-1", kind: "HSK" });
  seedCard(_cards, "c1", 1);
  _deckHskCards.set("deck-b:c1", { deckId: "deck-b", cardId: "c1" });

  const counts = await getDeckCardCountsByHskLevel(prisma, "deck-a");

  assert.deepEqual(counts, [{ level: 1, count: 1 }], "card di deck lain tetap dihitung");
});

// ============================================================
// getDeckCardCountsByCategory — jumlah card per kategori yang BELUM ada di deck
// ============================================================

test("getDeckCardCountsByCategory mengembalikan count per kategori yang belum ada di deck", async () => {
  const { prisma, _decks, _deckChunkCards, _dailyTalkCards } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "CHUNKING" });
  seedDailyTalkCard(_dailyTalkCards, "d1", "daily");
  seedDailyTalkCard(_dailyTalkCards, "d2", "daily");
  seedDailyTalkCard(_dailyTalkCards, "d3", "tech");
  _deckChunkCards.set("deck-a:d1", { deckId: "deck-a", dailyTalkCardId: "d1" });

  const counts = await getDeckCardCountsByCategory(prisma, "deck-a");

  assert.deepEqual(counts, [
    { category: "daily", count: 1 }, // d1 sudah ada di deck
    { category: "tech", count: 1 },
  ]);
});

test("getDeckCardCountsByCategory mengembalikan [] kalau semua kartu sudah di deck", async () => {
  const { prisma, _decks, _deckChunkCards, _dailyTalkCards } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "CHUNKING" });
  seedDailyTalkCard(_dailyTalkCards, "d1", "daily");
  _deckChunkCards.set("deck-a:d1", { deckId: "deck-a", dailyTalkCardId: "d1" });

  const counts = await getDeckCardCountsByCategory(prisma, "deck-a");

  assert.deepEqual(counts, []);
});

// ============================================================
// getDeckCurriculumKind — dibaca langsung dari Deck.kind
// ============================================================

test("getDeckCurriculumKind mengembalikan hsk untuk deck HSK", async () => {
  const { prisma, _decks } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });

  const kind = await getDeckCurriculumKind(prisma, "deck-a");

  assert.equal(kind, "hsk");
});

test("getDeckCurriculumKind mengembalikan category untuk deck CHUNKING (Daily Talk)", async () => {
  const { prisma, _decks } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "CHUNKING" });

  const kind = await getDeckCurriculumKind(prisma, "deck-a");

  assert.equal(kind, "category");
});

test("getDeckCurriculumKind mengembalikan hsk untuk deck CUSTOM", async () => {
  const { prisma, _decks } = makeFakePrisma();
  _decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "CUSTOM" });

  const kind = await getDeckCurriculumKind(prisma, "deck-a");

  assert.equal(kind, "hsk");
});

test("getDeckCurriculumKind mengembalikan hsk untuk deck yang tidak ada", async () => {
  const { prisma } = makeFakePrisma();

  const kind = await getDeckCurriculumKind(prisma, "deck-gone");

  assert.equal(kind, "hsk");
});

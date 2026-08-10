// lib/card-browser.test.ts
// Test browser kartu deck: parsing query (search/status/sort/page), pagination,
// dan gabungan sumber kartu (hsk|chunk|custom) beserta progress. Pakai fake
// prisma (dependency injection) supaya tidak butuh database live.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseBrowseQuery,
  type BrowseQuery,
  getDeckBrowseCards,
  DeckNotFoundError,
} from "./card-browser";
import { CardStatus } from "@prisma/client";

// ============================================================
// parseBrowseQuery — query parsing (murni, tanpa DB)
// ============================================================

test("parseBrowseQuery default: semua kartu, sort hanzi, halaman 1", () => {
  const q = parseBrowseQuery(new URLSearchParams());
  assert.equal(q.source, "all");
  assert.equal(q.status, "all");
  assert.equal(q.sort, "hanzi");
  assert.equal(q.page, 1);
  assert.equal(q.pageSize, 30);
  assert.equal(q.search, "");
});

test("parseBrowseQuery menerima source hsk|chunk|custom dan alias tab", () => {
  assert.equal(parseBrowseQuery(new URLSearchParams({ source: "hsk" })).source, "hsk");
  assert.equal(parseBrowseQuery(new URLSearchParams({ source: "chunk" })).source, "chunk");
  assert.equal(parseBrowseQuery(new URLSearchParams({ source: "custom" })).source, "custom");
  // tab invalid -> fallback all
  assert.equal(parseBrowseQuery(new URLSearchParams({ tab: "bogus" })).source, "all");
  // source menang atas tab kalau keduanya ada
  assert.equal(
    parseBrowseQuery(new URLSearchParams({ tab: "hsk", source: "custom" })).source,
    "custom"
  );
});

test("parseBrowseQuery menerima alias limit untuk pageSize (clamped)", () => {
  assert.equal(parseBrowseQuery(new URLSearchParams({ limit: "50" })).pageSize, 50);
  assert.equal(parseBrowseQuery(new URLSearchParams({ limit: "500" })).pageSize, 100);
  assert.equal(parseBrowseQuery(new URLSearchParams({ limit: "0" })).pageSize, 10);
  // pageSize menang atas limit kalau keduanya ada
  assert.equal(parseBrowseQuery(new URLSearchParams({ limit: "10", pageSize: "50" })).pageSize, 50);
});

test("parseBrowseQuery membaca source/status/sort/search/page", () => {
  const q = parseBrowseQuery(
    new URLSearchParams({ source: "custom", status: "REVIEW", sort: "hsk", search: "你", page: "2" })
  );
  assert.equal(q.source, "custom");
  assert.equal(q.status, "REVIEW");
  assert.equal(q.sort, "hsk");
  assert.equal(q.search, "你");
  assert.equal(q.page, 2);
});

test("parseBrowseQuery menolak nilai source/status/sort tidak dikenal", () => {
  assert.equal(parseBrowseQuery(new URLSearchParams({ source: "bogus" })).source, "all");
  assert.equal(parseBrowseQuery(new URLSearchParams({ status: "bogus" })).status, "all");
  assert.equal(parseBrowseQuery(new URLSearchParams({ sort: "bogus" })).sort, "hanzi");
});

test("parseBrowseQuery clamp page/pageSize", () => {
  assert.equal(parseBrowseQuery(new URLSearchParams({ page: "0" })).page, 1);
  assert.equal(parseBrowseQuery(new URLSearchParams({ page: "-3" })).page, 1);
  assert.equal(parseBrowseQuery(new URLSearchParams({ page: "abc" })).page, 1);
  assert.equal(parseBrowseQuery(new URLSearchParams({ pageSize: "500" })).pageSize, 100);
  assert.equal(parseBrowseQuery(new URLSearchParams({ pageSize: "0" })).pageSize, 10);
});

// ============================================================
// getDeckBrowseCards — fetch + pagination (fake prisma)
// ============================================================

function makeFakePrisma() {
  const decks = new Map<string, { id: string; userId: string; kind: "HSK" | "CHUNKING" | "CUSTOM" }>();
  const deckHskCards = new Map<
    string,
    {
      deckId: string;
      cardId: string;
      card: {
        id: string;
        hanzi: string;
        pinyin: string;
        artiId: string;
        artiEn: string;
        hskLevel: number;
      };
    }
  >();
  const deckChunkCards = new Map<
    string,
    {
      deckId: string;
      dailyTalkCardId: string;
      dailyTalkCard: {
        id: string;
        hanzi: string;
        pinyin: string;
        arti: string;
        category: string;
      };
    }
  >();
  const customCards = new Map<
    string,
    { id: string; userId: string; deckId: string; hanzi: string; pinyin: string; arti: string; hskLevel: number | null }
  >();
  const cardProgress = new Map<string, { status: CardStatus; dueDate: Date; lastReviewedAt: Date | null }>();
  const dailyTalkProgress = new Map<string, { status: CardStatus; dueDate: Date; lastReviewedAt: Date | null }>();
  const customCardProgress = new Map<string, { status: CardStatus; dueDate: Date; lastReviewedAt: Date | null }>();

  const prisma: unknown = {
    deck: {
      // findUnique dipakai assertDeckOwnership (tanpa include)
      async findUnique({ where }: { where: { id: string } }) {
        return decks.get(where.id) ?? null;
      },
      // findUniqueOrThrow dipakai getDeckBrowseCards (dengan include relasi)
      async findUniqueOrThrow({ where, include }: { where: { id: string }; include: { deckHskCards: unknown; deckChunkCards: unknown; customCards: unknown } }) {
        const deck = decks.get(where.id);
        if (!deck) throw new Error("Deck not found");
        const hsk = [...deckHskCards.values()].filter((dc) => dc.deckId === deck.id);
        const chunk = [...deckChunkCards.values()].filter((dc) => dc.deckId === deck.id);
        const custom = [...customCards.values()].filter((cc) => cc.deckId === deck.id);
        return { ...deck, deckHskCards: hsk, deckChunkCards: chunk, customCards: custom };
      },
    },
    cardProgress: {
      async findMany({ where }: { where: { userId: string; cardId: { in: string[] } } }) {
        return where.cardId.in
          .filter((id) => cardProgress.has(id))
          .map((id) => ({ cardId: id, ...cardProgress.get(id)! }));
      },
    },
    dailyTalkProgress: {
      async findMany({ where }: { where: { userId: string; dailyTalkCardId: { in: string[] } } }) {
        return where.dailyTalkCardId.in
          .filter((id) => dailyTalkProgress.has(id))
          .map((id) => ({ dailyTalkCardId: id, ...dailyTalkProgress.get(id)! }));
      },
    },
    customCardProgress: {
      async findMany({ where }: { where: { userId: string; customCardId: { in: string[] } } }) {
        return where.customCardId.in
          .filter((id) => customCardProgress.has(id))
          .map((id) => ({ customCardId: id, ...customCardProgress.get(id)! }));
      },
    },
  };

  return {
    prisma: prisma as Parameters<typeof getDeckBrowseCards>[0],
    _decks: decks,
    _deckHskCards: deckHskCards,
    _deckChunkCards: deckChunkCards,
    _customCards: customCards,
    _cardProgress: cardProgress,
    _dailyTalkProgress: dailyTalkProgress,
    _customCardProgress: customCardProgress,
  };
}

function seedHskCard(
  f: ReturnType<typeof makeFakePrisma>,
  deckId: string,
  id: string,
  hanzi: string,
  hskLevel: number
) {
  f._deckHskCards.set(`${deckId}:${id}`, {
    deckId,
    cardId: id,
    card: { id, hanzi, pinyin: `p-${id}`, artiId: `arti-${id}`, artiEn: `en-${id}`, hskLevel },
  });
}

function seedChunkCard(
  f: ReturnType<typeof makeFakePrisma>,
  deckId: string,
  id: string,
  hanzi: string,
  category: string
) {
  f._deckChunkCards.set(`${deckId}:${id}`, {
    deckId,
    dailyTalkCardId: id,
    dailyTalkCard: { id, hanzi, pinyin: `p-${id}`, arti: `arti-${id}`, category },
  });
}

function seedCustomCard(
  f: ReturnType<typeof makeFakePrisma>,
  deckId: string,
  userId: string,
  id: string,
  hanzi: string,
  hskLevel: number | null
) {
  f._customCards.set(id, { id, userId, deckId, hanzi, pinyin: `p-${id}`, arti: `arti-${id}`, hskLevel });
}

test("getDeckBrowseCards menolak non-pemilik deck (DeckNotFoundError)", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });

  await assert.rejects(
    () => getDeckBrowseCards(f.prisma, "deck-a", "user-2", {}),
    (err: unknown) => err instanceof DeckNotFoundError
  );
  await assert.rejects(
    () => getDeckBrowseCards(f.prisma, "deck-gone", "user-1", {}),
    (err: unknown) => err instanceof DeckNotFoundError
  );
});

test("getDeckBrowseCards menggabungkan hsk + chunk + custom dengan progress", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "CHUNKING" });
  seedHskCard(f, "deck-a", "c1", "你好", 1);
  seedChunkCard(f, "deck-a", "d1", "早安", "daily");
  seedCustomCard(f, "deck-a", "user-1", "cc1", "咖啡", null);
  f._cardProgress.set("c1", { status: CardStatus.REVIEW, dueDate: new Date(Date.now() + 86400000), lastReviewedAt: new Date() });
  f._dailyTalkProgress.set("d1", { status: CardStatus.LEARNING, dueDate: new Date(Date.now() + 3600000), lastReviewedAt: new Date() });
  f._customCardProgress.set("cc1", { status: CardStatus.NEW, dueDate: new Date(), lastReviewedAt: null });

  const result = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", {});

  assert.equal(result.cards.length, 3);
  const hsk = result.cards.find((c) => c.source === "hsk")!;
  const chunk = result.cards.find((c) => c.source === "chunk")!;
  const custom = result.cards.find((c) => c.source === "custom")!;
  assert.equal(hsk.status, CardStatus.REVIEW);
  assert.ok(hsk.lastReviewedAt instanceof Date);
  assert.ok(hsk.nextReviewAt instanceof Date);
  assert.equal(hsk.category, null);
  assert.equal(chunk.status, CardStatus.LEARNING);
  assert.equal(chunk.category, "daily");
  assert.equal(custom.status, CardStatus.NEW);
  assert.equal(custom.lastReviewedAt, null);
  assert.equal(custom.arti, "arti-cc1");
});

test("getDeckBrowseCards filter status", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });
  seedHskCard(f, "deck-a", "c1", "你好", 1);
  seedHskCard(f, "deck-a", "c2", "再见", 1);
  seedHskCard(f, "deck-a", "c3", "谢谢", 1);
  f._cardProgress.set("c1", { status: CardStatus.NEW, dueDate: new Date(), lastReviewedAt: null });
  f._cardProgress.set("c2", { status: CardStatus.REVIEW, dueDate: new Date(Date.now() + 1000), lastReviewedAt: new Date() });
  f._cardProgress.set("c3", { status: CardStatus.MASTERED, dueDate: new Date(Date.now() + 100000), lastReviewedAt: new Date() });

  const result = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", { status: "REVIEW" });
  assert.equal(result.cards.length, 1);
  assert.equal(result.cards[0].cardId, "c2");
});

test("getDeckBrowseCards filter source hsk|chunk|custom", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "CHUNKING" });
  seedHskCard(f, "deck-a", "c1", "你好", 1);
  seedChunkCard(f, "deck-a", "d1", "早安", "daily");
  seedCustomCard(f, "deck-a", "user-1", "cc1", "咖啡", 2);

  const hsk = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", { source: "hsk" });
  assert.equal(hsk.cards.length, 1);
  assert.equal(hsk.cards[0].cardId, "c1");

  const chunk = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", { source: "chunk" });
  assert.equal(chunk.cards.length, 1);
  assert.equal(chunk.cards[0].cardId, "d1");

  const custom = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", { source: "custom" });
  assert.equal(custom.cards.length, 1);
  assert.equal(custom.cards[0].cardId, "cc1");
});

test("getDeckBrowseCards search hanzi atau pinyin (case-insensitive)", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });
  seedHskCard(f, "deck-a", "c1", "你好", 1);
  seedHskCard(f, "deck-a", "c2", "再见", 2);
  seedHskCard(f, "deck-a", "c3", "咖啡", 3);

  const byHanzi = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", { search: "你好" });
  assert.equal(byHanzi.cards.length, 1);
  assert.equal(byHanzi.cards[0].cardId, "c1");

  const byPinyin = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", { search: "P-C3" });
  assert.equal(byPinyin.cards.length, 1);
  assert.equal(byPinyin.cards[0].cardId, "c3");
});

test("getDeckBrowseCards sort by hsk/status/lastReviewed/hanzi", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });
  // Hanzi dipilih supaya urutan code point jelas: 苹(U+82F9) < 葡(U+8461) < 香(U+9999)
  seedHskCard(f, "deck-a", "c1", "苹果", 3);
  seedHskCard(f, "deck-a", "c2", "香蕉", 1);
  seedHskCard(f, "deck-a", "c3", "葡萄", 2);
  f._cardProgress.set("c1", { status: CardStatus.REVIEW, dueDate: new Date(), lastReviewedAt: new Date(Date.now() - 1000) });
  f._cardProgress.set("c2", { status: CardStatus.NEW, dueDate: new Date(), lastReviewedAt: null });
  f._cardProgress.set("c3", { status: CardStatus.MASTERED, dueDate: new Date(), lastReviewedAt: new Date(Date.now() - 999999) });

  const byHsk = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", { sort: "hsk" });
  assert.deepEqual(byHsk.cards.map((c) => c.cardId), ["c2", "c3", "c1"]);

  const byHanzi = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", { sort: "hanzi" });
  assert.deepEqual(byHanzi.cards.map((c) => c.cardId), ["c1", "c3", "c2"]);

  // Urutan status: NEW < LEARNING < REVIEW < MASTERED
  const byStatus = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", { sort: "status" });
  assert.deepEqual(byStatus.cards.map((c) => c.cardId), ["c2", "c1", "c3"]);

  // Terakhir direview paling baru dulu; belum pernah direview (null) paling akhir
  const byLastReviewed = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", { sort: "lastReviewed" });
  assert.deepEqual(byLastReviewed.cards.map((c) => c.cardId), ["c1", "c3", "c2"]);
});

test("getDeckBrowseCards pagination: total, page, hasMore", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });
  for (let i = 1; i <= 5; i++) {
    seedHskCard(f, "deck-a", `c${i}`, `词${i}`, 1);
  }

  const page1 = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", { page: 1, pageSize: 2 });
  assert.equal(page1.cards.length, 2);
  assert.equal(page1.total, 5);
  assert.equal(page1.page, 1);
  assert.equal(page1.pageSize, 2);
  assert.equal(page1.hasMore, true);

  const page3 = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", { page: 3, pageSize: 2 });
  assert.equal(page3.cards.length, 1);
  assert.equal(page3.hasMore, false);
});

test("getDeckBrowseCards deck kosong", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-1", kind: "HSK" });

  const result = await getDeckBrowseCards(f.prisma, "deck-a", "user-1", {});
  assert.equal(result.cards.length, 0);
  assert.equal(result.total, 0);
  assert.equal(result.hasMore, false);
});

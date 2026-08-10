// lib/vocab-gate.test.ts
// Test vocab whitelist: deck-scoped mastered lookup + filter tipe SHUXIE/RENDU.
// `getDeckMasteredCards` diuji dengan fake prisma (tanpa DB).
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDeckMasteredCards } from "./fsrs";
import { buildVocabWhitelist } from "./vocab-gate";
import { CardStatus } from "@prisma/client";

function makeFakePrisma() {
  const decks = new Map<string, { id: string; userId: string }>();
  const deckCards = new Map<string, { deckId: string; cardId: string; card: { id: string; hanzi: string; pinyin: string; artiId: string; tipe: "SHUXIE" | "RENDU" } }>();
  const customCards = new Map<string, { id: string; userId: string; deckId: string; hanzi: string; pinyin: string; arti: string }>();
  const cardProgress = new Map<string, { status: CardStatus; stability: number; consecutiveSuccess: number }>();
  const customCardProgress = new Map<string, { status: CardStatus; stability: number; consecutiveSuccess: number }>();

  const prisma: unknown = {
    deck: {
      async findUnique({ where }: { where: { id: string } }) {
        return decks.get(where.id) ?? null;
      },
    },
    deckCard: {
      async findMany({ where }: { where: { deckId: string } }) {
        return [...deckCards.values()]
          .filter((dc) => dc.deckId === where.deckId)
          .map((dc) => ({ cardId: dc.cardId }));
      },
    },
    customCard: {
      async findMany({ where }: { where: { deckId: string } }) {
        return [...customCards.values()]
          .filter((cc) => cc.deckId === where.deckId)
          .map((cc) => ({ id: cc.id }));
      },
    },
    cardProgress: {
      async findMany({ where }: { where: { userId: string; status: CardStatus } }) {
        return [...cardProgress.entries()]
          .filter(([, p]) => p.status === CardStatus.MASTERED)
          .map(([id]) => {
            const dc = [...deckCards.values()].find((d) => d.cardId === id);
            return { cardId: id, card: dc?.card };
          });
      },
    },
    customCardProgress: {
      async findMany({ where }: { where: { userId: string; status: CardStatus } }) {
        return [...customCardProgress.entries()]
          .filter(([, p]) => p.status === CardStatus.MASTERED)
          .map(([id]) => {
            const cc = customCards.get(id);
            return { customCardId: id, customCard: cc ? { ...cc } : undefined };
          });
      },
    },
  };

  return {
    prisma: prisma as Parameters<typeof getDeckMasteredCards>[0],
    _decks: decks,
    _deckCards: deckCards,
    _customCards: customCards,
    _cardProgress: cardProgress,
    _customCardProgress: customCardProgress,
  };
}

const masteredCard = (id: string, hanzi: string, tipe: "SHUXIE" | "RENDU") => ({
  id,
  hanzi,
  pinyin: "p",
  artiId: "arti",
  tipe,
});

test("getDeckMasteredCards hanya mengambil mastered card di dalam deck", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-1" });
  f._deckCards.set("deck-a:card-1", { deckId: "deck-a", cardId: "card-1", card: masteredCard("card-1", "你好", "SHUXIE") });
  f._deckCards.set("deck-a:card-2", { deckId: "deck-a", cardId: "card-2", card: masteredCard("card-2", "再见", "RENDU") });
  f._cardProgress.set("card-1", { status: CardStatus.MASTERED, stability: 30, consecutiveSuccess: 0 });
  f._cardProgress.set("card-2", { status: CardStatus.NEW, stability: 0, consecutiveSuccess: 0 });

  const result = await getDeckMasteredCards(f.prisma, "user-1", "deck-a");

  assert.equal(result.length, 1);
  assert.equal(result[0].hanzi, "你好");
});

test("getDeckMasteredCards menyertakan custom card mastered di dalam deck", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-1" });
  f._customCards.set("cc-1", { id: "cc-1", userId: "user-1", deckId: "deck-a", hanzi: "咖啡", pinyin: "kāfēi", arti: "kopi" });
  f._customCardProgress.set("cc-1", { status: CardStatus.MASTERED, stability: 25, consecutiveSuccess: 0 });

  const result = await getDeckMasteredCards(f.prisma, "user-1", "deck-a");

  assert.equal(result.length, 1);
  assert.equal(result[0].hanzi, "咖啡");
  assert.equal(result[0].source, "custom");
});

test("getDeckMasteredCards mengembalikan field tipe untuk global card", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-1" });
  f._deckCards.set("deck-a:card-1", { deckId: "deck-a", cardId: "card-1", card: masteredCard("card-1", "你好", "SHUXIE") });
  f._cardProgress.set("card-1", { status: CardStatus.MASTERED, stability: 30, consecutiveSuccess: 0 });

  const result = await getDeckMasteredCards(f.prisma, "user-1", "deck-a");

  assert.equal(result[0].tipe, "SHUXIE");
});

test("getDeckMasteredCards menolak deck milik user lain", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-2" });

  await assert.rejects(() => getDeckMasteredCards(f.prisma, "user-1", "deck-a"));
});

test("buildVocabWhitelist dengan tipeFilter SHUXIE hanya memuat kata SHUXIE", () => {
  const words = [
    { hanzi: "你好", pinyin: "p", artiId: "a", tipe: "SHUXIE" as const },
    { hanzi: "再见", pinyin: "p", artiId: "a", tipe: "RENDU" as const },
  ];
  const whitelist = buildVocabWhitelist(words, "SHUXIE");
  assert.equal(whitelist.has("你好"), true);
  assert.equal(whitelist.has("再见"), false);
});

test("buildVocabWhitelist tanpa tipeFilter memuat kedua tipe", () => {
  const words = [
    { hanzi: "你好", pinyin: "p", artiId: "a", tipe: "SHUXIE" as const },
    { hanzi: "再见", pinyin: "p", artiId: "a", tipe: "RENDU" as const },
  ];
  const whitelist = buildVocabWhitelist(words);
  assert.equal(whitelist.has("你好"), true);
  assert.equal(whitelist.has("再见"), true);
});

// lib/deck-review.test.ts
// Test pengambilan kandidat review dari deck: gabungan hsk + chunk + custom card,
// lengkap dengan progress user untuk menandai due/new.
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDeckReviewCandidates, DeckNotFoundError } from "./deck";
import { CardStatus } from "@prisma/client";

function makeFakePrisma() {
  const decks = new Map<string, { id: string; userId: string }>();
  const deckHskCards = new Map<string, { deckId: string; cardId: string; card: { id: string; hanzi: string; pinyin: string; artiId: string; artiEn: string; hskLevel: number; partOfSpeech: string; exampleSentence: string | null; tipe: "SHUXIE" | "RENDU" } }>();
  const deckChunkCards = new Map<string, { deckId: string; dailyTalkCardId: string; dailyTalkCard: { id: string; hanzi: string; pinyin: string; arti: string; category: string } }>();
  const customCards = new Map<string, { id: string; userId: string; deckId: string; hanzi: string; pinyin: string; arti: string; hskLevel: number | null; exampleSentence: string | null }>();
  const cardProgress = new Map<string, { status: CardStatus; dueDate: Date }>();
  const dailyTalkProgress = new Map<string, { status: CardStatus; dueDate: Date }>();
  const customCardProgress = new Map<string, { status: CardStatus; dueDate: Date }>();

  const prisma: unknown = {
    deck: {
      async findUnique({ where, include }: { where: { id: string }; include: any }) {
        const d = decks.get(where.id);
        if (!d) return null;
        return {
          ...d,
          deckHskCards: [...deckHskCards.values()].filter((dc) => dc.deckId === d.id),
          deckChunkCards: [...deckChunkCards.values()].filter((dc) => dc.deckId === d.id),
          customCards: [...customCards.values()].filter((cc) => cc.deckId === d.id),
        };
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
    prisma: prisma as Parameters<typeof getDeckReviewCandidates>[0],
    _decks: decks,
    _deckHskCards: deckHskCards,
    _deckChunkCards: deckChunkCards,
    _customCards: customCards,
    _cardProgress: cardProgress,
    _dailyTalkProgress: dailyTalkProgress,
    _customCardProgress: customCardProgress,
  };
}

const card = (id: string, hanzi: string) => ({
  id,
  hanzi,
  pinyin: "p",
  artiId: "arti",
  artiEn: "artien",
  hskLevel: 1,
  partOfSpeech: "名",
  exampleSentence: null,
  tipe: "SHUXIE" as const,
});

const chunkCard = (id: string, hanzi: string, category: string) => ({
  id,
  hanzi,
  pinyin: "p",
  arti: "arti",
  category,
});

test("getDeckReviewCandidates menggabungkan hsk + chunk + custom", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-1" });
  f._deckHskCards.set("deck-a:card-1", { deckId: "deck-a", cardId: "card-1", card: card("card-1", "你好") });
  f._deckChunkCards.set("deck-a:chunk-1", { deckId: "deck-a", dailyTalkCardId: "chunk-1", dailyTalkCard: chunkCard("chunk-1", "下午好", "daily") });
  f._customCards.set("cc-1", { id: "cc-1", userId: "user-1", deckId: "deck-a", hanzi: "咖啡", pinyin: "kāfēi", arti: "kopi", hskLevel: 2, exampleSentence: null });

  const result = await getDeckReviewCandidates(f.prisma, "user-1", "deck-a");

  assert.equal(result.cards.length, 3);
  const hskCard = result.cards.find((c) => c.source === "hsk");
  const chunk = result.cards.find((c) => c.source === "chunk");
  const customCard = result.cards.find((c) => c.source === "custom");
  assert.equal(hskCard?.cardId, "card-1");
  assert.equal(chunk?.cardId, "chunk-1");
  assert.equal(chunk?.category, "daily");
  assert.equal(customCard?.cardId, "cc-1");
});

test("getDeckReviewCandidates menandai kartu due vs new dari progress", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-1" });
  f._deckHskCards.set("deck-a:card-1", { deckId: "deck-a", cardId: "card-1", card: card("card-1", "你好") });
  f._cardProgress.set("card-1", { status: CardStatus.REVIEW, dueDate: new Date(Date.now() - 1000) });

  const result = await getDeckReviewCandidates(f.prisma, "user-1", "deck-a");

  assert.equal(result.cards[0].status, CardStatus.REVIEW);
  assert.ok(result.cards[0].dueDate instanceof Date);
});

test("getDeckReviewCandidates menolak deck milik user lain", async () => {
  const f = makeFakePrisma();
  f._decks.set("deck-a", { id: "deck-a", userId: "user-2" });

  await assert.rejects(
    () => getDeckReviewCandidates(f.prisma, "user-1", "deck-a"),
    (err: unknown) => err instanceof DeckNotFoundError
  );
});

test("getDeckReviewCandidates menolak deck yang tidak ada", async () => {
  const f = makeFakePrisma();
  await assert.rejects(() => getDeckReviewCandidates(f.prisma, "user-1", "deck-gone"));
});

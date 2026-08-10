// lib/review-cards.test.ts
// Test normalisasi kartu review dari deck — hsk (Card), chunk (DailyTalkCard), dan
// custom (CustomCard) harus dijadikan satu shape konsisten yang bisa dipakai UI
// review tanpa tahu asal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeReviewCard, type NormalizedReviewCard } from "./deck";
import type { CardType, CardStatus, Prisma } from "@prisma/client";

// Simulasi bentuk baris Prisma untuk DeckHskCard include card
const hskCardRow: Prisma.DeckHskCardGetPayload<{ include: { card: true } }> = {
  id: "dh-1",
  deckId: "deck-a",
  cardId: "card-1",
  card: {
    id: "card-1",
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    artiId: "halo",
    artiEn: "hello",
    hskLevel: 1,
    extraLevelNote: null,
    partOfSpeech: "动",
    topicId: null,
    tipe: "SHUXIE",
    exampleSentence: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

// Simulasi bentuk baris Prisma untuk DeckChunkCard include dailyTalkCard
const chunkCardRow: Prisma.DeckChunkCardGetPayload<{ include: { dailyTalkCard: true } }> = {
  id: "dc-1",
  deckId: "deck-a",
  dailyTalkCardId: "chunk-1",
  dailyTalkCard: {
    id: "chunk-1",
    hanzi: "下午好",
    pinyin: "xiàwǔ hǎo",
    arti: "selamat sore",
    category: "daily",
    exampleSentence: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

const customCardRow: Prisma.CustomCardGetPayload<{}> = {
  id: "cc-1",
  userId: "user-1",
  deckId: "deck-a",
  hanzi: "咖啡",
  pinyin: "kāfēi",
  arti: "kopi",
  hskLevel: 2,
  topicId: null,
  exampleSentence: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const progressLike = {
  stability: 5,
  difficulty: 0.2,
  dueDate: new Date(),
  reviewCount: 2,
  lapses: 0,
  status: "REVIEW" as CardStatus,
  lastReviewedAt: new Date(),
};

test("normalizeReviewCard menghasilkan shape identik untuk hsk, chunk, dan custom", () => {
  const g = normalizeReviewCard("hsk", hskCardRow.card, null);
  const k = normalizeReviewCard("chunk", chunkCardRow.dailyTalkCard, null);
  const c = normalizeReviewCard("custom", customCardRow, null);

  assert.equal(g.source, "hsk");
  assert.equal(g.cardId, "card-1");
  assert.equal(k.source, "chunk");
  assert.equal(k.cardId, "chunk-1");
  assert.equal(k.category, "daily");
  assert.equal(c.source, "custom");
  assert.equal(c.cardId, "cc-1");

  // field yang sama-sama wajib ada
  for (const key of ["cardId", "hanzi", "pinyin", "artiId", "artiEn", "tipe"] as const) {
    assert.ok(key in g, `hsk harus punya ${key}`);
    assert.ok(key in c, `custom harus punya ${key}`);
  }
});

test("normalizeReviewCard memetakan tipe dari Card global (SHUXIE/RENDU)", () => {
  const g = normalizeReviewCard("hsk", hskCardRow.card, null);
  assert.equal(g.tipe, "SHUXIE");
});

test("normalizeReviewCard menggabungkan progress untuk semua sumber", () => {
  const g = normalizeReviewCard("hsk", hskCardRow.card, progressLike);
  assert.equal(g.status, "REVIEW");
  assert.equal(g.dueDate?.getTime(), progressLike.dueDate.getTime());

  const k = normalizeReviewCard("chunk", chunkCardRow.dailyTalkCard, progressLike);
  assert.equal(k.status, "REVIEW");

  const c = normalizeReviewCard("custom", customCardRow, progressLike);
  assert.equal(c.status, "REVIEW");
});

test("normalizeReviewCard: custom tanpa progress status NEW, dueDate null", () => {
  const c = normalizeReviewCard("custom", customCardRow, null);
  assert.equal(c.status, "NEW");
  assert.equal(c.dueDate, null);
});

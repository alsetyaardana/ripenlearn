// lib/review-session.test.ts
// Test routing rating review ke model progress yang benar berdasarkan sumber kartu
// (hsk -> CardProgress, chunk -> DailyTalkProgress, custom -> CustomCardProgress) dengan atomik upsert.
import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewCardForUser } from "./deck";
import { CardStatus } from "@prisma/client";

function makeFakePrisma() {
  const cardProgress = new Map<string, { userId: string; cardId: string }>();
  const dailyTalkProgress = new Map<string, { userId: string; dailyTalkCardId: string }>();
  const customCardProgress = new Map<string, { userId: string; customCardId: string }>();
  const cards = new Map<string, { id: string }>();
  const dailyTalkCards = new Map<string, { id: string }>();
  const customCards = new Map<string, { id: string; userId: string }>();

  const prisma: unknown = {
    card: {
      async findUnique({ where }: { where: { id: string } }) {
        return cards.get(where.id) ?? null;
      },
    },
    dailyTalkCard: {
      async findUnique({ where }: { where: { id: string } }) {
        return dailyTalkCards.get(where.id) ?? null;
      },
    },
    customCard: {
      async findUnique({ where }: { where: { id: string } }) {
        return customCards.get(where.id) ?? null;
      },
    },
    cardProgress: {
      async findUnique({ where }: { where: { userId_cardId: { userId: string; cardId: string } } }) {
        return null;
      },
      async upsert({ where, create }: { where: { userId_cardId: { userId: string; cardId: string } }; create: { userId: string; cardId: string } }) {
        cardProgress.set(where.userId_cardId.userId + ":" + where.userId_cardId.cardId, create);
        return { ...create, status: CardStatus.REVIEW };
      },
    },
    dailyTalkProgress: {
      async findUnique({ where }: { where: { userId_dailyTalkCardId: { userId: string; dailyTalkCardId: string } } }) {
        return null;
      },
      async upsert({ where, create }: { where: { userId_dailyTalkCardId: { userId: string; dailyTalkCardId: string } }; create: { userId: string; dailyTalkCardId: string } }) {
        dailyTalkProgress.set(where.userId_dailyTalkCardId.userId + ":" + where.userId_dailyTalkCardId.dailyTalkCardId, create);
        return { ...create, status: CardStatus.REVIEW };
      },
    },
    customCardProgress: {
      async findUnique({ where }: { where: { userId_customCardId: { userId: string; customCardId: string } } }) {
        return null;
      },
      async upsert({ where, create }: { where: { userId_customCardId: { userId: string; customCardId: string } }; create: { userId: string; customCardId: string } }) {
        customCardProgress.set(where.userId_customCardId.userId + ":" + where.userId_customCardId.customCardId, create);
        return { ...create, status: CardStatus.REVIEW };
      },
    },
  };

  return {
    prisma: prisma as Parameters<typeof reviewCardForUser>[0],
    _cardProgress: cardProgress,
    _dailyTalkProgress: dailyTalkProgress,
    _customCardProgress: customCardProgress,
    _cards: cards,
    _dailyTalkCards: dailyTalkCards,
    _customCards: customCards,
  };
}

test("reviewCardForUser hsk card menulis ke CardProgress", async () => {
  const f = makeFakePrisma();
  f._cards.set("card-1", { id: "card-1" });

  await reviewCardForUser(f.prisma, "user-1", { source: "hsk", cardId: "card-1" }, "good");

  assert.equal(f._cardProgress.has("user-1:card-1"), true);
  assert.equal(f._customCardProgress.size, 0);
  assert.equal(f._dailyTalkProgress.size, 0);
});

test("reviewCardForUser chunk card menulis ke DailyTalkProgress", async () => {
  const f = makeFakePrisma();
  f._dailyTalkCards.set("chunk-1", { id: "chunk-1" });

  await reviewCardForUser(f.prisma, "user-1", { source: "chunk", cardId: "chunk-1" }, "good");

  assert.equal(f._dailyTalkProgress.has("user-1:chunk-1"), true);
  assert.equal(f._cardProgress.size, 0);
});

test("reviewCardForUser custom card menulis ke CustomCardProgress", async () => {
  const f = makeFakePrisma();
  f._customCards.set("cc-1", { id: "cc-1", userId: "user-1" });

  await reviewCardForUser(f.prisma, "user-1", { source: "custom", cardId: "cc-1" }, "easy");

  assert.equal(f._customCardProgress.has("user-1:cc-1"), true);
  assert.equal(f._cardProgress.size, 0);
});

test("reviewCardForUser menolak custom card milik user lain", async () => {
  const f = makeFakePrisma();
  f._customCards.set("cc-1", { id: "cc-1", userId: "user-2" });

  await assert.rejects(
    () => reviewCardForUser(f.prisma, "user-1", { source: "custom", cardId: "cc-1" }, "good")
  );
});

test("reviewCardForUser menolak rating tidak valid", async () => {
  const f = makeFakePrisma();
  f._cards.set("card-1", { id: "card-1" });

  await assert.rejects(
    () => reviewCardForUser(f.prisma, "user-1", { source: "hsk", cardId: "card-1" }, "invalid" as never)
  );
});

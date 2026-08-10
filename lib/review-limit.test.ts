// lib/review-limit.test.ts
// Test bahwa queue review memakai limit kartu baru harian dari UserSettings,
// bukan hardcode 20. Ownership & isolation antar user tetap dijaga.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReviewQueue, DEFAULT_NEW_CARDS_PER_DAY } from "./review-limit";
import { CardStatus, type PrismaClient } from "@prisma/client";

function makeFakePrisma() {
  // settings per user
  const settings = new Map<string, { newCardsPerDay: number }>();
  // cards per user: NormalizedReviewCard
  const cardStore = new Map<string, import("./deck").NormalizedReviewCard[]>();

  const prisma: unknown = {
    userSettings: {
      async findUnique({ where }: { where: { userId: string } }) {
        return settings.get(where.userId) ?? null;
      },
    },
  };

  return {
    prisma: prisma as PrismaClient,
    _settings: settings,
    _cards: cardStore,
  };
}

function makeCard(overrides: Partial<import("./deck").NormalizedReviewCard> = {}): import("./deck").NormalizedReviewCard {
  return {
    cardId: "c-1",
    source: "global",
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    artiId: "halo",
    artiEn: "hello",
    partOfSpeech: null,
    exampleSentence: null,
    tipe: "SHUXIE",
    status: CardStatus.NEW,
    dueDate: null,
    hskLevel: 1,
    ...overrides,
  };
}

test("buildReviewQueue membatasi kartu baru sesuai setting user (bukan 20 hardcode)", async () => {
  const f = makeFakePrisma();
  f._settings.set("user-1", { newCardsPerDay: 5 });

  const due = [makeCard({ cardId: "d1", status: CardStatus.REVIEW, dueDate: new Date(Date.now() - 1000) })];
  const newCards = Array.from({ length: 10 }, (_, i) => makeCard({ cardId: `n${i}` }));

  const queue = await buildReviewQueue(f.prisma, "user-1", due, newCards);

  assert.equal(queue.due.length, 1, "kartu due tetap semua");
  assert.equal(queue.new.length, 5, "kartu baru dibatasi 5 sesuai setting");
  assert.equal(queue.newLimit, 5);
});

test("buildReviewQueue default limit 20 kalau user belum set setting", async () => {
  const f = makeFakePrisma();
  const due: import("./deck").NormalizedReviewCard[] = [];
  const newCards = Array.from({ length: 30 }, (_, i) => makeCard({ cardId: `n${i}` }));

  const queue = await buildReviewQueue(f.prisma, "user-2", due, newCards);

  assert.equal(queue.newLimit, DEFAULT_NEW_CARDS_PER_DAY);
  assert.equal(queue.new.length, DEFAULT_NEW_CARDS_PER_DAY);
});

test("buildReviewQueue user isolation: limit user lain tidak mempengaruhi user ini", async () => {
  const f = makeFakePrisma();
  f._settings.set("user-1", { newCardsPerDay: 2 });
  f._settings.set("user-2", { newCardsPerDay: 50 });

  const newCards = Array.from({ length: 10 }, (_, i) => makeCard({ cardId: `n${i}` }));

  const q1 = await buildReviewQueue(f.prisma, "user-1", [], newCards);
  const q2 = await buildReviewQueue(f.prisma, "user-2", [], newCards);

  assert.equal(q1.new.length, 2);
  assert.equal(q2.new.length, 10, "user-2 punya limit 50 sehingga semua 10 kartu lolos");
});

test("buildReviewQueue: kalau kartu baru lebih sedikit dari limit, semua masuk", async () => {
  const f = makeFakePrisma();
  f._settings.set("user-1", { newCardsPerDay: 20 });

  const newCards = Array.from({ length: 3 }, (_, i) => makeCard({ cardId: `n${i}` }));
  const queue = await buildReviewQueue(f.prisma, "user-1", [], newCards);

  assert.equal(queue.new.length, 3);
});

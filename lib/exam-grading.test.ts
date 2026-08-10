// lib/exam-grading.test.ts
// Test server-owned mapping exam soal -> FSRS: soal membawa cardId dari whitelist
// server (bukan invent LLM), dan grading benar/salah meng-update progress hanya
// untuk kartu milik user.
import { test } from "node:test";
import assert from "node:assert/strict";
import { assignExamCardIds, type ExamQuestionInput } from "./ai";
import { gradeExamAnswer } from "./deck";
import { CardStatus } from "@prisma/client";

test("assignExamCardIds memilih cardId dari whitelist untuk tiap soal", () => {
  const masteredWords = [
    { id: "card-1", hanzi: "你好", pinyin: "nǐhǎo", artiId: "halo", tipe: "SHUXIE" as const, source: "global" as const },
    { id: "card-2", hanzi: "再见", pinyin: "zàijiàn", artiId: "sampai jumpa", tipe: "RENDU" as const, source: "global" as const },
    { id: "cc-1", hanzi: "咖啡", pinyin: "kāfēi", artiId: "kopi", tipe: "RENDU" as const, source: "custom" as const },
  ];
  // whitelist diwakili set hanzi; cardId dipetakan dari `hanzi` di sini (simulasi).
  const questions: ExamQuestionInput[] = [
    { question: "____，你好！", options: ["早上好", "再见", "咖啡", "你好"], correctIndex: 3, target: "你好" },
    { question: "下次____！", options: ["你好", "再见", "咖啡", "早上好"], correctIndex: 1, target: "再见" },
    { question: "我要一杯____。", options: ["你好", "再见", "咖啡", "早上好"], correctIndex: 2, target: "咖啡" },
  ];

  const result = assignExamCardIds(masteredWords, questions);

  assert.equal(result[0].cardId, "card-1");
  assert.equal(result[0].source, "global");
  assert.equal(result[1].cardId, "card-2");
  assert.equal(result[2].cardId, "cc-1");
  assert.equal(result[2].source, "custom");
});

test("assignExamCardIds tidak menaruh cardId untuk kata di luar whitelist", () => {
  const masteredWords = [{ id: "card-1", hanzi: "你好", pinyin: "nǐhǎo", artiId: "halo", tipe: "SHUXIE" as const, source: "global" as const }];
  const questions: ExamQuestionInput[] = [
    { question: "____", options: ["a", "b", "c", "d"], correctIndex: 0, target: "tidak-dikenal" },
  ];

  const result = assignExamCardIds(masteredWords, questions);

  assert.equal(result[0].cardId, null);
});

function makeFakePrisma() {
  const cardProgress = new Map<string, { cardId: string; reviewCount: number }>();
  const cards = new Map<string, { id: string }>();
  const prisma: unknown = {
    card: {
      async findUnique({ where }: { where: { id: string } }) {
        return cards.get(where.id) ?? null;
      },
    },
    cardProgress: {
      async findUnique() { return null; },
      async upsert({ create }: { create: { userId: string; cardId: string } }) {
        cardProgress.set(create.userId + ":" + create.cardId, { cardId: create.cardId, reviewCount: 1 });
        return { ...create, status: CardStatus.REVIEW };
      },
    },
  };
  return { prisma: prisma as Parameters<typeof gradeExamAnswer>[0], _cardProgress: cardProgress, _cards: cards };
}

test("gradeExamAnswer jawaban benar menambah reviewCount", async () => {
  const f = makeFakePrisma();
  f._cards.set("card-1", { id: "card-1" });

  await gradeExamAnswer(f.prisma, "user-1", { source: "global", cardId: "card-1" }, true);

  assert.equal(f._cardProgress.get("user-1:card-1")?.reviewCount, 1);
});

test("gradeExamAnswer jawaban salah juga mereview (memakai rating again)", async () => {
  const f = makeFakePrisma();
  f._cards.set("card-1", { id: "card-1" });

  await gradeExamAnswer(f.prisma, "user-1", { source: "global", cardId: "card-1" }, false);

  assert.equal(f._cardProgress.has("user-1:card-1"), true);
});

test("gradeExamAnswer mengabaikan soal tanpa cardId (null)", async () => {
  const f = makeFakePrisma();

  await gradeExamAnswer(f.prisma, "user-1", { source: "global", cardId: null }, true);

  assert.equal(f._cardProgress.size, 0);
});

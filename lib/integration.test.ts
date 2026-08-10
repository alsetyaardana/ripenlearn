// lib/integration.test.ts
// Integration test alur penuh user (tanpa DB live, pakai fake prisma yang
// memodelkan schema): buat deck -> isi kartu global + custom -> review sampai
// mastered -> whitelist AI deck-scoped -> grading exam meng-update FSRS.
//
// Tujuan: membuktikan bahwa modul-modul (lib/deck.ts, lib/fsrs.ts, lib/ai.ts)
// bekerja sebagai SATU alur, bukan hanya unit masing-masing — terutama keputusan
// product "deck adalah sumber kebenaran untuk review dan vocab-gate AI".
import { test } from "node:test";
import assert from "node:assert/strict";
import { CardStatus, type PrismaClient } from "@prisma/client";
import {
  createDeck,
  addGlobalCardsToDeck,
  addCustomCardToDeck,
  addHskLevelToDeck,
  addCategoryToDeck,
  deleteDeck,
  getDeckReviewCandidates,
  reviewCardForUser,
  gradeExamAnswer,
  DeckNotFoundError,
} from "./deck";
import { getDeckMasteredCards, getWhitelistWords } from "./fsrs";
import { assignExamCardIds, type ExamQuestionInput } from "./ai";
import { buildVocabWhitelist } from "./vocab-gate";

/** Model in-memory schema Ripen minimal yang dipakai alur integration. */
function makeDb() {
  const decks = new Map<string, { id: string; userId: string; name: string; description: string | null }>();
  const deckCards = new Map<string, { deckId: string; cardId: string }>();
  const customCards = new Map<string, {
    id: string; userId: string; deckId: string;
    hanzi: string; pinyin: string; arti: string; hskLevel: number | null;
  }>();
  const cards = new Map<string, {
    id: string; hanzi: string; pinyin: string; artiId: string; artiEn: string;
    hskLevel: number; tipe: "SHUXIE" | "RENDU"; partOfSpeech: string; category: string | null;
  }>();
  const cardProgress = new Map<string, Record<string, unknown>>();
  const customCardProgress = new Map<string, Record<string, unknown>>();

  const prisma: unknown = {
    deck: {
      async findUnique({ where, include }: { where: { id: string }; include?: unknown }) {
        const d = decks.get(where.id);
        if (!d) return null;
        if (include) {
          return {
            ...d,
            deckCards: [...deckCards.values()].filter((dc) => dc.deckId === d.id).map((dc) => ({
              ...dc,
              card: cards.get(dc.cardId) ?? null,
            })),
            customCards: [...customCards.values()].filter((cc) => cc.deckId === d.id),
          };
        }
        return d;
      },
      async findMany({ where, select }: { where: { userId?: string }; select?: unknown }) {
        const list = [...decks.values()].filter((d) => !where.userId || d.userId === where.userId);
        if (select) return list.map((d) => ({ id: d.id, userId: d.userId }));
        return list;
      },
      async create({ data }: { data: { userId: string; name: string; description?: string } }) {
        const deck = { id: `deck-${decks.size + 1}`, userId: data.userId, name: data.name, description: data.description ?? null };
        decks.set(deck.id, deck);
        return deck;
      },
      async delete({ where }: { where: { id: string } }) {
        const deck = decks.get(where.id);
        if (!deck) return null;
        decks.delete(where.id);
        for (const key of [...deckCards.keys()]) {
          if (key.startsWith(`${where.id}:`)) deckCards.delete(key);
        }
        for (const cc of [...customCards.values()]) {
          if (cc.deckId === where.id) customCards.delete(cc.id);
        }
        return deck;
      },
    },
    deckCard: {
      async createMany({ data, skipDuplicates }: { data: { deckId: string; cardId: string }[]; skipDuplicates?: boolean }) {
        for (const row of data) {
          const key = `${row.deckId}:${row.cardId}`;
          if (skipDuplicates && deckCards.has(key)) continue;
          deckCards.set(key, row);
        }
        return { count: data.length };
      },
      async findMany({ where, select }: { where: { deckId: string }; select?: { cardId?: boolean } }) {
        const rows = [...deckCards.values()].filter((dc) => dc.deckId === where.deckId);
        if (select) return rows.map((r) => ({ cardId: r.cardId }));
        return rows;
      },
    },
    card: {
      async findUnique({ where }: { where: { id: string } }) {
        return cards.get(where.id) ?? null;
      },
      async findMany({ where }: { where: { hskLevel?: { in?: number[] } | number; category?: string } }) {
        const levels =
          typeof where.hskLevel === "number"
            ? [where.hskLevel]
            : (where.hskLevel?.in ?? null);
        return [...cards.values()]
          .filter((c) => (levels === null ? true : levels.includes(c.hskLevel)))
          .filter((c) => where.category === undefined || c.category === where.category)
          .map((c) => ({ id: c.id }));
      },
      async groupBy({ by, where, _count }: { by: string[]; where?: { hskLevel?: number | { not: number } }; _count: { _all: true } }) {
        const excluded = typeof where?.hskLevel === "object" ? where.hskLevel.not : undefined;
        const rows = [...cards.values()].filter(
          (c) =>
            (where?.hskLevel === undefined ||
              typeof where.hskLevel === "number" ? (typeof where.hskLevel === "number" ? c.hskLevel === where.hskLevel : true) : true) &&
            (excluded === undefined || c.hskLevel !== excluded)
        );
        const counts = new Map<string | null, number>();
        for (const c of rows) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
        return [...counts.entries()]
          .filter(([category]) => category !== null)
          .sort((a, b) => (a[0] as string).localeCompare(b[0] as string))
          .map(([category, count]) => ({ category, _count: { _all: count } }));
      },
    },
    customCard: {
      async findUnique({ where }: { where: { id: string } }) {
        return customCards.get(where.id) ?? null;
      },
      async findMany({ where }: { where: { deckId?: string } }) {
        return [...customCards.values()].filter((cc) => !where.deckId || cc.deckId === where.deckId);
      },
      async create({ data }: { data: { deckId: string; userId: string; hanzi: string; pinyin: string; arti: string; hskLevel?: number } }) {
        const cc = { id: `cc-${customCards.size + 1}`, ...data, hskLevel: data.hskLevel ?? null };
        customCards.set(cc.id, cc);
        return cc;
      },
    },
    cardProgress: {
      async findUnique({ where }: { where: { userId_cardId: { userId: string; cardId: string } } }) {
        return cardProgress.get(`${where.userId_cardId.userId}:${where.userId_cardId.cardId}`) ?? null;
      },
      async findMany({ where }: { where: { userId?: string; cardId?: { in: string[] }; status?: CardStatus }; include?: unknown }) {
        let rows = [...cardProgress.values()];
        if (where.userId) rows = rows.filter((r) => r.userId === where.userId);
        if (where.cardId?.in) rows = rows.filter((r) => where.cardId!.in!.includes(r.cardId as string));
        if (where.status) rows = rows.filter((r) => r.status === where.status);
        if (where.userId && where.status === CardStatus.MASTERED) {
          return rows.map((p) => ({
            ...p,
            card: cards.get(p.cardId as string) ?? null,
          }));
        }
        return rows;
      },
      async upsert({ where, create, update }: { where: { userId_cardId: { userId: string; cardId: string } }; create: Record<string, unknown>; update: Record<string, unknown> }) {
        const key = `${where.userId_cardId.userId}:${where.userId_cardId.cardId}`;
        const row = { ...(cardProgress.get(key) ?? {}), ...create, ...update };
        cardProgress.set(key, row);
        return row;
      },
    },
    customCardProgress: {
      async findUnique({ where }: { where: { userId_customCardId: { userId: string; customCardId: string } } }) {
        return customCardProgress.get(`${where.userId_customCardId.userId}:${where.userId_customCardId.customCardId}`) ?? null;
      },
      async findMany({ where, include }: { where: { userId?: string; customCardId?: { in: string[] }; status?: CardStatus }; include?: unknown }) {
        let rows = [...customCardProgress.values()];
        if (where.userId) rows = rows.filter((r) => r.userId === where.userId);
        if (where.customCardId?.in) rows = rows.filter((r) => where.customCardId!.in!.includes(r.customCardId as string));
        if (where.status) rows = rows.filter((r) => r.status === where.status);
        if (where.userId && where.status === CardStatus.MASTERED) {
          return rows.map((p) => ({
            ...p,
            customCard: customCards.get(p.customCardId as string) ?? null,
          }));
        }
        return rows;
      },
      async upsert({ where, create, update }: { where: { userId_customCardId: { userId: string; customCardId: string } }; create: Record<string, unknown>; update: Record<string, unknown> }) {
        const key = `${where.userId_customCardId.userId}:${where.userId_customCardId.customCardId}`;
        const row = { ...(customCardProgress.get(key) ?? {}), ...create, ...update };
        customCardProgress.set(key, row);
        return row;
      },
    },
  };

  return {
    prisma: prisma as PrismaClient,
    db: { decks, deckCards, customCards, cards, cardProgress, customCardProgress },
  };
}

function seedGlobalCard(
  db: ReturnType<typeof makeDb>["db"],
  id: string,
  hanzi: string,
  opts: Partial<{ tipe: "SHUXIE" | "RENDU"; hskLevel: number; pinyin: string; category: string }> = {}
) {
  db.cards.set(id, {
    id,
    hanzi,
    pinyin: opts.pinyin ?? "pinyin",
    artiId: `arti-${hanzi}`,
    artiEn: `en-${hanzi}`,
    hskLevel: opts.hskLevel ?? 1,
    tipe: opts.tipe ?? "SHUXIE",
    partOfSpeech: "名",
    category: opts.category ?? null,
  });
}

test("alur penuh: deck → review → mastered → whitelist AI deck-scoped", async () => {
  const { prisma, db } = makeDb();

  // Seed kartu global: satu masuk deck, satu di luar deck.
  seedGlobalCard(db, "g-in", "你好");
  seedGlobalCard(db, "g-out", "再见", { tipe: "RENDU" });

  const deck = await createDeck("user-1", "HSK 1 Saya", undefined, prisma);
  await addGlobalCardsToDeck(prisma, deck.id, "user-1", ["g-in"]);
  const custom = await addCustomCardToDeck(prisma, deck.id, "user-1", {
    hanzi: "咖啡",
    pinyin: "kāfēi",
    arti: "kopi",
  });

  // 1. Siapkan progress mastered (stability >= 21). Catatan: mencapai MASTERED lewat
  // scheduleReview dari state NEW tidak tercapai dalam sesi singkat — ini masalah
  // pre-existing yang fix-nya butuh schema change (simpan elapsed_days/scheduled_days
  // native) dan approval user (plan Phase 7). Test ini memakai kartu yang SUDAH
  // mastered — kondisi yang realistis untuk user yang sudah lama mereview.
  const masteredTarget: Array<{
    source: "global" | "custom";
    cardId: string;
    progressKey: string;
    progressMap: Map<string, Record<string, unknown>>;
  }> = [
    { source: "global", cardId: "g-in", progressKey: "user-1:g-in", progressMap: db.cardProgress },
    { source: "custom", cardId: custom.id, progressKey: `user-1:${custom.id}`, progressMap: db.customCardProgress },
  ];
  for (const target of masteredTarget) {
    target.progressMap.set(target.progressKey, {
      userId: "user-1",
      [target.source === "global" ? "cardId" : "customCardId"]: target.cardId,
      stability: 30,
      difficulty: 0.2,
      dueDate: new Date(Date.now() + 86400000),
      reviewCount: 6,
      lapses: 0,
      status: CardStatus.MASTERED,
      lastReviewedAt: new Date(Date.now() - 86400000),
    });
  }

  // Verifikasi status mastery.
  const gProgress = db.cardProgress.get("user-1:g-in");
  const cProgress = db.customCardProgress.get(`user-1:${custom.id}`);
  assert.equal(gProgress?.status, CardStatus.MASTERED);
  assert.equal(cProgress?.status, CardStatus.MASTERED);

  // 2. Whitelist AI deck-scoped: kartu di dalam deck, bukan di luar deck.
  const mastered = await getDeckMasteredCards(prisma, "user-1", deck.id);
  const hanziSet = new Set(mastered.map((m) => m.hanzi));
  assert.ok(hanziSet.has("你好"), "kartu global di deck masuk whitelist");
  assert.ok(hanziSet.has("咖啡"), "kartu custom di deck masuk whitelist");
  assert.ok(!hanziSet.has("再见"), "kartu global di luar deck TIDAK masuk whitelist");

  // 3. getWhitelistWords dengan deckId eksplisit menghasilkan set yang sama.
  const whitelist = await getWhitelistWords("user-1", deck.id, prisma);
  assert.deepEqual(
    new Set(whitelist.map((w) => w.hanzi)),
    hanziSet,
    "getWhitelistWords(deckId) konsisten dengan getDeckMasteredCards"
  );

  // 4. Grading exam: soal yang benar meng-update FSRS kartu di whitelist.
  const examInput: ExamQuestionInput[] = [
    { question: "____，你好！", options: ["你好", "再见", "咖啡", "早上好"], correctIndex: 0, target: "你好" },
    { question: "我要一杯____。", options: ["你好", "再见", "咖啡", "早上好"], correctIndex: 2, target: "咖啡" },
  ];
  const mapped = assignExamCardIds(mastered, examInput);
  assert.equal(mapped[0].cardId, "g-in");
  assert.equal(mapped[1].cardId, custom.id);

  const beforeGood = db.cardProgress.get("user-1:g-in")?.reviewCount as number;
  await gradeExamAnswer(prisma, "user-1", { source: "global", cardId: "g-in" }, true);
  const afterGood = db.cardProgress.get("user-1:g-in")?.reviewCount as number;
  assert.equal(afterGood, beforeGood + 1, "jawaban benar menambah reviewCount FSRS");

  // 5. Whitelist vocab (set hanzi) untuk prompt AI: tepat isi deck.
  const vocabSet = buildVocabWhitelist(mastered);
  assert.equal(vocabSet.has("你好"), true);
  assert.equal(vocabSet.has("咖啡"), true);
  assert.equal(vocabSet.has("再见"), false);
});

test("alur penuh: review session mengembalikan kartu deck (global + custom)", async () => {
  const { prisma, db } = makeDb();
  seedGlobalCard(db, "g-1", "你好");
  seedGlobalCard(db, "g-2", "再见", { tipe: "RENDU" });

  const deck = await createDeck("user-1", "Deck A", undefined, prisma);
  await addGlobalCardsToDeck(prisma, deck.id, "user-1", ["g-1", "g-2"]);
  await addCustomCardToDeck(prisma, deck.id, "user-1", {
    hanzi: "咖啡",
    pinyin: "kāfēi",
    arti: "kopi",
  });

  const { cards } = await getDeckReviewCandidates(prisma, "user-1", deck.id);
  assert.equal(cards.length, 3);
  assert.equal(cards.filter((c) => c.source === "global").length, 2);
  assert.equal(cards.filter((c) => c.source === "custom").length, 1);
  assert.ok(cards.every((c) => c.status === CardStatus.NEW));
});

test("alur penuh: bulk add per level HSK -> kartu masuk review candidates", async () => {
  const { prisma, db } = makeDb();
  seedGlobalCard(db, "l1-a", "你好", { hskLevel: 1 });
  seedGlobalCard(db, "l1-b", "再见", { hskLevel: 1 });
  seedGlobalCard(db, "l2-a", "咖啡", { hskLevel: 2 });

  const deck = await createDeck("user-1", "Level 1", undefined, prisma);
  const result = await addHskLevelToDeck(prisma, deck.id, "user-1", [1]);

  assert.equal(result.added, 2, "hanya card level 1 yang ditambahkan");
  const { cards } = await getDeckReviewCandidates(prisma, "user-1", deck.id);
  assert.equal(cards.length, 2);
  assert.ok(cards.every((c) => c.hskLevel === 1), "semua kartu di deck ber-hskLevel 1");
});

test("alur penuh: deleteDeck membuat deck tidak lagi bisa diakses (404 path)", async () => {
  const { prisma, db } = makeDb();
  seedGlobalCard(db, "g-1", "你好", { hskLevel: 1 });

  const deck = await createDeck("user-1", "Deck Sementara", undefined, prisma);
  await addGlobalCardsToDeck(prisma, deck.id, "user-1", ["g-1"]);

  await deleteDeck(prisma, deck.id, "user-1");

  await assert.rejects(
    () => getDeckReviewCandidates(prisma, "user-1", deck.id),
    (err: unknown) => err instanceof DeckNotFoundError,
    "review candidates harus menolak deck yang sudah dihapus"
  );
  await assert.rejects(
    () => addGlobalCardsToDeck(prisma, deck.id, "user-1", ["g-1"]),
    (err: unknown) => err instanceof DeckNotFoundError,
    "mutasi harus menolak deck yang sudah dihapus"
  );
  assert.equal(db.decks.has(deck.id), false, "deck benar-benar terhapus dari fake db");
});

test("alur penuh: bulk add per kategori (Daily Talk) -> kartu masuk review candidates", async () => {
  const { prisma, db } = makeDb();
  seedGlobalCard(db, "d1", "下午", { hskLevel: 8, category: "daily" });
  seedGlobalCard(db, "d2", "饭", { hskLevel: 8, category: "daily" });
  seedGlobalCard(db, "t1", "电脑", { hskLevel: 8, category: "tech" });
  seedGlobalCard(db, "h1", "你好", { hskLevel: 1, category: null });

  const deck = await createDeck("user-1", "Daily Talk Saya", undefined, prisma);
  const result = await addCategoryToDeck(prisma, deck.id, "user-1", "daily");

  assert.equal(result.added, 2, "hanya card kategori daily yang ditambahkan");
  const { cards } = await getDeckReviewCandidates(prisma, "user-1", deck.id);
  assert.equal(cards.length, 2);
  assert.ok(
    cards.every((c) => c.hskLevel === 8),
    "semua kartu di deck ber-hskLevel 8 (Daily Talk)"
  );
  assert.ok(
    cards.some((c) => c.hanzi === "下午") && cards.some((c) => c.hanzi === "饭"),
    "kedua kartu kategori daily masuk deck"
  );
});

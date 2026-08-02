// lib/deck.ts
// Dipegang oleh: srs-engine-agent (koordinasi dengan db-schema-agent untuk schema Deck)
// Logic deck custom per user: subset dari Card global + custom card buatan sendiri.
//
// Model: satu Deck bisa berisi campuran DUA sumber:
//   1. DeckCard  -> referensi ke Card global (HSK 3.0 resmi), user tinggal pilih subset
//   2. CustomCard -> kartu yang user buat sendiri, scoped ke satu Deck tertentu
//
// Review session, FSRS progress, dan vocab-gate untuk AI HARUS menggabungkan kedua
// sumber ini saat membangun "kartu yang due" atau "vocab mastered" milik user.
//
// Fase 1: review session jalan langsung di atas Card global (belum lewat Deck),
// lihat app/api/review/route.ts. Fungsi di sini disiapkan untuk Fase 1.5 (custom deck).

import { prisma } from "./prisma";

export interface DeckSummary {
  id: string;
  name: string;
  description: string | null;
  globalCardCount: number;
  customCardCount: number;
}

export interface DeckCardEntry {
  source: "global" | "custom";
  id: string;
  hanzi: string;
  pinyin: string;
  arti: string;
  hskLevel: number | null;
}

/** Buat deck baru untuk user. */
export async function createDeck(userId: string, name: string, description?: string) {
  return prisma.deck.create({
    data: { userId, name, description },
  });
}

/** Tambah subset Card global ke deck. Idempotent — skip yang sudah ada. */
export async function addGlobalCardsToDeck(deckId: string, cardIds: string[]) {
  await prisma.deckCard.createMany({
    data: cardIds.map((cardId) => ({ deckId, cardId })),
    skipDuplicates: true,
  });
}

/** Tambah custom card buatan user sendiri ke deck. */
export async function addCustomCardToDeck(
  deckId: string,
  userId: string,
  data: { hanzi: string; pinyin: string; arti: string; hskLevel?: number; exampleSentence?: string }
) {
  return prisma.customCard.create({
    data: { deckId, userId, ...data },
  });
}

/**
 * Ambil semua kartu (global + custom) dalam satu deck, digabung jadi satu list
 * dengan shape konsisten untuk keperluan review session.
 */
export async function getDeckCards(deckId: string): Promise<DeckCardEntry[]> {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      deckCards: { include: { card: true } },
      customCards: true,
    },
  });
  if (!deck) return [];

  const globalCards: DeckCardEntry[] = deck.deckCards.map((dc) => ({
    source: "global",
    id: dc.card.id,
    hanzi: dc.card.hanzi,
    pinyin: dc.card.pinyin,
    arti: dc.card.artiId,
    hskLevel: dc.card.hskLevel,
  }));

  const customCards: DeckCardEntry[] = deck.customCards.map((cc) => ({
    source: "custom",
    id: cc.id,
    hanzi: cc.hanzi,
    pinyin: cc.pinyin,
    arti: cc.arti,
    hskLevel: cc.hskLevel ?? null,
  }));

  return [...globalCards, ...customCards];
}

/** List semua deck milik user, dengan ringkasan jumlah kartu per sumber. */
export async function listDecksForUser(userId: string): Promise<DeckSummary[]> {
  const decks = await prisma.deck.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { deckCards: true, customCards: true } },
    },
  });

  return decks.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    globalCardCount: d._count.deckCards,
    customCardCount: d._count.customCards,
  }));
}

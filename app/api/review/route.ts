// app/api/review/route.ts
// Dipegang oleh: srs-engine-agent
// GET: ambil kartu due + batch kartu baru, di-scope ke deck target user (atau semua
// kartu kalau belum pilih deck). Sumber kartu ditentukan dari deck.kind:
//   - HSK      -> Card global via DeckHskCard (progress CardProgress)
//   - CHUNKING -> DailyTalkCard via DeckChunkCard (progress DailyTalkProgress)
//   - CUSTOM   -> CustomCard milik user (progress CustomCardProgress)
// POST: submit rating & update progress lewat lib/fsrs.ts (routing per source).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type ReviewRating } from "@/lib/fsrs";
import { getUserSettings } from "@/lib/settings";
import { getDailyNewCardLimit } from "@/lib/review-limit";
import { reviewCardForUser, DeckNotFoundError } from "@/lib/deck";
import { recordStudyDay } from "@/lib/streak";

// Session.user belum di-augment lewat next-auth.d.ts (id/tier ditambah runtime di
// lib/auth.ts callback session()) — cast eksplisit di sini sampai type augmentation
// dibuat.
function getUserId(session: { user?: unknown }): string {
  return (session.user as { id: string }).id;
}

type ReviewSource = "hsk" | "chunk" | "custom";

interface ReviewCardJson {
  cardId: string;
  source: ReviewSource;
  hanzi: string;
  pinyin: string;
  artiId: string;
  artiEn: string;
  partOfSpeech: string | null;
  exampleSentence: string | null;
  category?: string | null;
  hskLevel?: number | null;
  status: string;
  dueDate: string | null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getUserId(session);

  // Scope kartu mengikuti target belajar user: kalau targetDeckId di-set, hanya
  // kartu di deck itu yang ditawarkan, dengan sumber (progress table) sesuai
  // deck.kind. Kalau targetCategory juga di-set (deck CHUNKING), kartu dibatasi
  // ke kategori itu (DailyTalkCard.category). Null = semua kartu global.
  const settings = await getUserSettings(prisma, userId);
  const newLimit = await getDailyNewCardLimit(prisma, userId);

  // null = tanpa batasan (semua kartu pool itu ikut), [] = tidak ada kartu.
  let hskIds: string[] | null = null;
  let chunkIds: string[] | null = null;
  let customIds: string[] | null = null;
  const chunkCategory = settings.targetCategory ?? null;
  let displayMode: string = "HANZI_FRONT";

  if (settings.targetDeckId) {
    const deck = await prisma.deck.findUnique({
      where: { id: settings.targetDeckId },
      select: { id: true, kind: true, userId: true, displayMode: true },
    });
    if (deck && deck.userId === userId) {
      displayMode = deck.displayMode;
      if (deck.kind === "HSK") {
        hskIds = (
          await prisma.deckHskCard.findMany({
            where: { deckId: deck.id },
            select: { cardId: true },
          })
        ).map((r) => r.cardId);
      } else if (deck.kind === "CHUNKING") {
        chunkIds = (
          await prisma.deckChunkCard.findMany({
            where: { deckId: deck.id },
            select: { dailyTalkCardId: true },
          })
        ).map((r) => r.dailyTalkCardId);
      } else {
        customIds = (
          await prisma.customCard.findMany({
            where: { deckId: deck.id },
            select: { id: true },
          })
        ).map((c) => c.id);
      }
    }
  }

  const idFilter = (ids: string[] | null): { in: string[] } | undefined =>
    ids === null ? undefined : ids.length > 0 ? { in: ids } : { in: [] };

  const hskWhere = {
    ...(idFilter(hskIds) !== undefined ? { cardId: idFilter(hskIds) } : {}),
  };
  const chunkWhere = {
    ...(idFilter(chunkIds) !== undefined ? { dailyTalkCardId: idFilter(chunkIds) } : {}),
    ...(chunkCategory ? { dailyTalkCard: { category: chunkCategory } } : {}),
  };
  const customWhere = {
    ...(idFilter(customIds) !== undefined ? { customCardId: idFilter(customIds) } : {}),
  };

  const [dueHsk, dueChunk, dueCustom] = await Promise.all([
    hskIds === null || hskIds.length > 0
      ? prisma.cardProgress.findMany({
          where: { userId, dueDate: { lte: new Date() }, ...hskWhere },
          include: { card: true },
          orderBy: { dueDate: "asc" },
        })
      : Promise.resolve([]),
    chunkIds === null || chunkIds.length > 0
      ? prisma.dailyTalkProgress.findMany({
          where: { userId, dueDate: { lte: new Date() }, ...chunkWhere },
          include: { dailyTalkCard: true },
          orderBy: { dueDate: "asc" },
        })
      : Promise.resolve([]),
    customIds === null || customIds.length > 0
      ? prisma.customCardProgress.findMany({
          where: { userId, dueDate: { lte: new Date() }, ...customWhere },
          include: { customCard: true },
          orderBy: { dueDate: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const seenIds = new Set([
    ...dueHsk.map((p) => `hsk:${p.cardId}`),
    ...dueChunk.map((p) => `chunk:${p.dailyTalkCardId}`),
    ...dueCustom.map((p) => `custom:${p.customCardId}`),
  ]);

  const dueCards: ReviewCardJson[] = [
    ...dueHsk.map((p) => ({
      cardId: p.cardId,
      source: "hsk" as const,
      hanzi: p.card.hanzi,
      pinyin: p.card.pinyin,
      artiId: p.card.artiId,
      artiEn: p.card.artiEn,
      partOfSpeech: p.card.partOfSpeech,
      exampleSentence: p.card.exampleSentence,
      category: null,
      hskLevel: p.card.hskLevel,
      status: p.status,
      dueDate: p.dueDate.toISOString(),
    })),
    ...dueChunk.map((p) => ({
      cardId: p.dailyTalkCardId,
      source: "chunk" as const,
      hanzi: p.dailyTalkCard.hanzi,
      pinyin: p.dailyTalkCard.pinyin,
      artiId: p.dailyTalkCard.arti,
      artiEn: "",
      partOfSpeech: null,
      exampleSentence: p.dailyTalkCard.exampleSentence,
      category: p.dailyTalkCard.category,
      hskLevel: null,
      status: p.status,
      dueDate: p.dueDate.toISOString(),
    })),
    ...dueCustom.map((p) => ({
      cardId: p.customCardId,
      source: "custom" as const,
      hanzi: p.customCard.hanzi,
      pinyin: p.customCard.pinyin,
      artiId: p.customCard.arti,
      artiEn: "",
      partOfSpeech: null,
      exampleSentence: p.customCard.exampleSentence,
      category: null,
      hskLevel: p.customCard.hskLevel,
      status: p.status,
      dueDate: p.dueDate.toISOString(),
    })),
  ];

  // Kartu yang belum pernah direview sama sekali juga ditawarkan sebagai "new",
  // dibatasi per hari sesuai setting user (newCardsPerDay).
  const [newHsk, newChunk, newCustom] = await Promise.all([
    hskIds === null || hskIds.length > 0
      ? prisma.card.findMany({
          where: {
            ...(idFilter(hskIds) !== undefined ? { id: idFilter(hskIds) } : {}),
            progress: { none: { userId } },
          },
          take: newLimit,
          orderBy: { hskLevel: "asc" },
        })
      : Promise.resolve([]),
    chunkIds === null || chunkIds.length > 0
      ? prisma.dailyTalkCard.findMany({
          where: {
            ...(idFilter(chunkIds) !== undefined ? { id: idFilter(chunkIds) } : {}),
            ...(chunkCategory ? { category: chunkCategory } : {}),
            progress: { none: { userId } },
          },
          take: newLimit,
          orderBy: { category: "asc" },
        })
      : Promise.resolve([]),
    customIds === null || customIds.length > 0
      ? prisma.customCard.findMany({
          where: {
            ...(idFilter(customIds) !== undefined ? { id: idFilter(customIds) } : {}),
            progress: { none: { userId } },
          },
          take: newLimit,
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const newCards: ReviewCardJson[] = [
    ...newHsk
      .filter((c) => !seenIds.has(`hsk:${c.id}`))
      .map((c) => ({
        cardId: c.id,
        source: "hsk" as const,
        hanzi: c.hanzi,
        pinyin: c.pinyin,
        artiId: c.artiId,
        artiEn: c.artiEn,
        partOfSpeech: c.partOfSpeech,
        exampleSentence: c.exampleSentence,
        category: null,
        hskLevel: c.hskLevel,
        status: "NEW" as const,
        dueDate: null,
      })),
    ...newChunk
      .filter((c) => !seenIds.has(`chunk:${c.id}`))
      .map((c) => ({
        cardId: c.id,
        source: "chunk" as const,
        hanzi: c.hanzi,
        pinyin: c.pinyin,
        artiId: c.arti,
        artiEn: "",
        partOfSpeech: null,
        exampleSentence: c.exampleSentence,
        category: c.category,
        hskLevel: null,
        status: "NEW" as const,
        dueDate: null,
      })),
    ...newCustom
      .filter((c) => !seenIds.has(`custom:${c.id}`))
      .map((c) => ({
        cardId: c.id,
        source: "custom" as const,
        hanzi: c.hanzi,
        pinyin: c.pinyin,
        artiId: c.arti,
        artiEn: "",
        partOfSpeech: null,
        exampleSentence: c.exampleSentence,
        category: null,
        hskLevel: c.hskLevel,
        status: "NEW" as const,
        dueDate: null,
      })),
  ];

  return NextResponse.json({
    due: dueCards,
    new: newCards.slice(0, newLimit),
    newLimit,
    displayMode,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getUserId(session);

  const body = await req.json().catch(() => null);
  const cardId = body?.cardId as string | undefined;
  const rating = body?.rating as ReviewRating | undefined;
  // Sumber progress table: 'hsk' | 'chunk' | 'custom'. 'global' lama dipetakan ke
  // 'hsk' supaya client lama tetap jalan.
  let source = body?.source as string | undefined;
  if (source === "global") source = "hsk";
  const validRatings: ReviewRating[] = ["again", "hard", "good", "easy"];

  if (!cardId || !rating || !validRatings.includes(rating)) {
    return NextResponse.json(
      { error: "Invalid body: expected { cardId: string, source?: 'hsk'|'chunk'|'custom', rating: 'again'|'hard'|'good'|'easy' }" },
      { status: 400 }
    );
  }

  const validSources: ReviewSource[] = ["hsk", "chunk", "custom"];
  const sourceNorm = (source ?? "hsk") as ReviewSource;
  if (!validSources.includes(sourceNorm)) {
    return NextResponse.json(
      { error: "Invalid body: source harus 'hsk' | 'chunk' | 'custom'" },
      { status: 400 }
    );
  }

  try {
    const updated = await reviewCardForUser(prisma, userId, {
      source: sourceNorm,
      cardId,
    }, rating);
    // Catat hari belajar untuk streak (best-effort — gagal tidak memblokir rating).
    await recordStudyDay(prisma, userId, 1).catch(() => {});
    return NextResponse.json({ progress: updated });
  } catch (err) {
    if (err instanceof DeckNotFoundError) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    console.error("review route error:", err);
    return NextResponse.json({ error: "Gagal menyimpan rating." }, { status: 500 });
  }
}

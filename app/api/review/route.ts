// app/api/review/route.ts
// Dipegang oleh: srs-engine-agent
// GET: ambil kartu due + batch kartu baru (Card global, Fase 1). POST: submit rating
// & update CardProgress lewat lib/fsrs.ts.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scheduleReview, type ReviewRating } from "@/lib/fsrs";
import { CardStatus } from "@prisma/client";

// Session.user belum di-augment lewat next-auth.d.ts (id/tier ditambah runtime di
// lib/auth.ts callback session()) — cast eksplisit di sini sampai type augmentation
// dibuat.
function getUserId(session: { user?: unknown }): string {
  return (session.user as { id: string }).id;
}

const NEW_CARD_BATCH_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getUserId(session);

  const dueProgress = await prisma.cardProgress.findMany({
    where: { userId, dueDate: { lte: new Date() } },
    include: { card: true },
    orderBy: { dueDate: "asc" },
  });

  const seenCardIds = dueProgress.map((p) => p.cardId);
  const dueCards = dueProgress.map((p) => ({
    cardId: p.cardId,
    hanzi: p.card.hanzi,
    pinyin: p.card.pinyin,
    artiId: p.card.artiId,
    artiEn: p.card.artiEn,
    partOfSpeech: p.card.partOfSpeech,
    exampleSentence: p.card.exampleSentence,
    status: p.status,
    dueDate: p.dueDate,
  }));

  // Kartu yang belum pernah direview sama sekali juga ditawarkan sebagai "due",
  // dibatasi per batch supaya satu sesi tidak kebanjiran kartu baru.
  const newCards = await prisma.card.findMany({
    where: {
      id: { notIn: seenCardIds },
      progress: { none: { userId } },
    },
    take: NEW_CARD_BATCH_SIZE,
    orderBy: { hskLevel: "asc" },
  });

  return NextResponse.json({
    due: dueCards,
    new: newCards.map((c) => ({
      cardId: c.id,
      hanzi: c.hanzi,
      pinyin: c.pinyin,
      artiId: c.artiId,
      artiEn: c.artiEn,
      partOfSpeech: c.partOfSpeech,
      exampleSentence: c.exampleSentence,
      status: "NEW" as const,
      dueDate: null,
    })),
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
  const validRatings: ReviewRating[] = ["again", "hard", "good", "easy"];

  if (!cardId || !rating || !validRatings.includes(rating)) {
    return NextResponse.json(
      { error: "Invalid body: expected { cardId: string, rating: 'again'|'hard'|'good'|'easy' }" },
      { status: 400 }
    );
  }

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const existing = await prisma.cardProgress.findUnique({
    where: { userId_cardId: { userId, cardId } },
  });

  const current = existing ?? {
    stability: 0,
    difficulty: 0,
    dueDate: new Date(),
    reviewCount: 0,
    lapses: 0,
    status: CardStatus.NEW,
    lastReviewedAt: null,
  };

  const next = scheduleReview(current, rating);

  const updated = await prisma.cardProgress.upsert({
    where: { userId_cardId: { userId, cardId } },
    create: { userId, cardId, ...next },
    update: next,
  });

  return NextResponse.json({ progress: updated });
}

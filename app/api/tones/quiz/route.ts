// app/api/tones/quiz/route.ts
// GET: Ambil 10 kartu random untuk tone quiz.
// Prioritas: kartu mastered user → fallback ke 10 HSK 1 random.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractTone } from "@/lib/tones";

function getUserId(session: { user?: unknown }): string {
  return (session.user as { id: string }).id;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getUserId(session);

  // Ambil kartu mastered user (CardProgress.status = MASTERED)
  const mastered = await prisma.cardProgress.findMany({
    where: { userId, status: "MASTERED" },
    include: { card: { select: { id: true, pinyin: true, hanzi: true, artiId: true } } },
  });

  let cards: { id: string; pinyin: string; hanzi: string; artiId: string }[];

  if (mastered.length >= 10) {
    // Shuffle & ambil 10
    const shuffled = mastered.sort(() => Math.random() - 0.5).slice(0, 10);
    cards = shuffled.map((m) => m.card);
  } else if (mastered.length > 0) {
    // Kurang dari 10, ambil semua mastered
    cards = mastered.map((m) => m.card);
  } else {
    // Fallback: 10 kartu HSK 1 random
    const hsk1 = await prisma.card.findMany({
      where: { hskLevel: 1 },
      select: { id: true, pinyin: true, hanzi: true, artiId: true },
    });
    cards = hsk1.sort(() => Math.random() - 0.5).slice(0, 10);
  }

  const quizCards = cards.map((c) => ({
    cardId: c.id,
    pinyin: c.pinyin,
    hanzi: c.hanzi,
    artiId: c.artiId,
    tone: extractTone(c.pinyin),
  }));

  return NextResponse.json(quizCards);
}

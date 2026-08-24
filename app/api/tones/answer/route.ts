// app/api/tones/answer/route.ts
// POST: Submit jawaban tone quiz, simpan hasil, return feedback.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractTone, getToneLabel } from "@/lib/tones";

function getUserId(session: { user?: unknown }): string {
  return (session.user as { id: string }).id;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getUserId(session);

  const body = await req.json().catch(() => null);
  const cardId = body?.cardId as string | undefined;
  const selectedTone = body?.selectedTone as number | undefined;

  if (!cardId || typeof selectedTone !== "number" || selectedTone < 1 || selectedTone > 5) {
    return NextResponse.json(
      { error: "Invalid body: expected { cardId: string, selectedTone: 1-5 }" },
      { status: 400 }
    );
  }

  // Ambil kartu dari DB
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, pinyin: true, hanzi: true },
  });

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const correctTone = extractTone(card.pinyin);
  const isCorrect = selectedTone === correctTone;

  // Simpan hasil quiz
  await prisma.toneQuizResult.create({
    data: { userId, cardId, selectedTone, correctTone, isCorrect },
  });

  // Bangun penjelasan
  const explanation = isCorrect
    ? `Benar! "${card.hanzi}" (${card.pinyin}) menggunakan ${getToneLabel(correctTone)}.`
    : `Salah. "${card.hanzi}" (${card.pinyin}) menggunakan ${getToneLabel(correctTone)}, bukan ${getToneLabel(selectedTone)}.`;

  return NextResponse.json({ correct: isCorrect, correctTone, explanation });
}

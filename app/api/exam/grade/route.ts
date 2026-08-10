// app/api/exam/grade/route.ts
// Grade jawaban exam — update FSRS untuk kartu target (server-owned mapping).
// Client hanya mengirim cardId+source yang TADI dikirim server saat generate;
// validasi kepemilikan ulang dilakukan server-side (gradeExamAnswer -> reviewCardForUser).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeExamAnswer, DeckNotFoundError } from "@/lib/deck";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const cardId = body?.cardId as string | null | undefined;
  const source = body?.source as "hsk" | "chunk" | "custom" | undefined;
  const correct = body?.correct as boolean | undefined;

  if (typeof correct !== "boolean" || typeof cardId !== "string" || !cardId) {
    return NextResponse.json(
      { error: "Invalid body: expected { cardId: string, source: 'global'|'custom', correct: boolean }" },
      { status: 400 }
    );
  }
  if (source !== "hsk" && source !== "chunk" && source !== "custom") {
    return NextResponse.json(
      { error: "Invalid body: source harus 'hsk', 'chunk', atau 'custom'" },
      { status: 400 }
    );
  }

  try {
    const progress = await gradeExamAnswer(
      prisma,
      userId,
      { source, cardId },
      correct
    );
    return NextResponse.json({ progress });
  } catch (err) {
    if (err instanceof DeckNotFoundError) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    console.error("exam grade route error:", err);
    return NextResponse.json({ error: "Gagal menyimpan hasil ujian." }, { status: 500 });
  }
}

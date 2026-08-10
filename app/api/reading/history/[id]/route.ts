// app/api/reading/history/[id]/route.ts
// GET — detail satu riwayat baca: passage, terjemahan, token pinyin, dan pertanyaan
// pemahaman lengkap dengan options + kunci jawaban.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const reading = await prisma.readingSession.findFirst({
    where: { id, userId },
    select: {
      id: true,
      topic: true,
      passage: true,
      translation: true,
      tokens: true,
      createdAt: true,
      questions: {
        select: { id: true, question: true, options: true, answer: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!reading) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    session: {
      id: reading.id,
      topic: reading.topic,
      passage: reading.passage,
      translation: reading.translation,
      tokens: reading.tokens,
      createdAt: reading.createdAt.toISOString(),
      questions: reading.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: Array.isArray(q.options) ? q.options : [],
        correctIndex: q.answer,
      })),
    },
  });
}

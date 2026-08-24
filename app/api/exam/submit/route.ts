// app/api/exam/submit/route.ts
// Submit jawaban ujian — server bandingkan dengan correctIndex yang disimpan di Redis.
// Client kirim: { examId: string, answers: number[] }
// Server return: { results: { correct: boolean, correctIndex: number }[], score: number }

import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { auth } from "@/lib/auth";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:36379");

interface StoredExamQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

function examKey(examId: string): string {
  return `exam:${examId}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.examId !== "string" ||
    !Array.isArray(body.answers)
  ) {
    return NextResponse.json(
      { error: "Invalid body: expected { examId: string, answers: number[] }" },
      { status: 400 }
    );
  }

  const { examId, answers } = body as { examId: string; answers: number[] };

  // Ambil mapping dari Redis
  const raw = await redis.get(examKey(examId));
  if (!raw) {
    return NextResponse.json(
      { error: "Sesi ujian tidak ditemukan atau sudah kedaluwarsa" },
      { status: 404 }
    );
  }

  const stored: StoredExamQuestion[] = JSON.parse(raw);

  if (answers.length !== stored.length) {
    return NextResponse.json(
      { error: `Jumlah jawaban (${answers.length}) tidak sesuai jumlah soal (${stored.length})` },
      { status: 400 }
    );
  }

  // Bandingkan server-side
  let score = 0;
  const results = stored.map((q, i) => {
    const correct = answers[i] === q.correctIndex;
    if (correct) score++;
    return { correct, correctIndex: q.correctIndex };
  });

  // Hapus sesi setelah submit (one-time use)
  await redis.del(examKey(examId));

  return NextResponse.json({ results, score, total: stored.length });
}

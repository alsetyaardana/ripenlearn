// app/api/exam/route.ts
// Dipegang oleh: ai-integration-agent + srs-engine-agent
// Generate soal simulasi ujian dari kartu mastered.
// correctIndex disimpan server-side (Redis), TIDAK dikirim ke client.
// Client submit jawaban ke POST /api/exam/submit, server bandingkan.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import Redis from "ioredis";
import { auth } from "@/lib/auth";
import { checkQuota, QuotaExceededError } from "@/lib/quota";
import { generateExamQuestions } from "@/lib/ai";
import { getMasteredCardsForDeck } from "@/lib/fsrs";
import { getUserSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:36379");

// TTL 30 menit — cukup untuk satu sesi ujian
const EXAM_SESSION_TTL = 1800;

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

  const userId = session.user.id;
  const tier = session.user.tier ?? "FREE";

  try {
    await checkQuota(userId, "exam", tier);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: "Quota exam harian habis", resetAt: err.resetAt },
        { status: 429 }
      );
    }
    throw err;
  }

  try {
    const settings = await getUserSettings(prisma, userId);
    const masteredWords = await getMasteredCardsForDeck(userId, settings.targetDeckId);
    const exam = await generateExamQuestions(masteredWords);

    // Simpan correctIndex di server, jangan kirim ke client
    const examId = randomUUID();
    const stored: StoredExamQuestion[] = exam.questions.map((q) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
    }));
    await redis.set(examKey(examId), JSON.stringify(stored), "EX", EXAM_SESSION_TTL);

    // Kirim ke client TANPA correctIndex
    const clientQuestions = exam.questions.map((q) => ({
      question: q.question,
      options: q.options,
    }));

    return NextResponse.json({
      examId,
      questions: clientQuestions,
      vocabWarning: exam.vocabWarning,
    });
  } catch (err) {
    console.error("exam route error:", err);
    return NextResponse.json(
      { error: "Gagal membuat soal ujian, coba lagi sebentar lagi." },
      { status: 502 }
    );
  }
}

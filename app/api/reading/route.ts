// app/api/reading/route.ts
// Dipegang oleh: ai-integration-agent
// Generate paragraf latihan baca dari vocab mastered only + pertanyaan pemahaman.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkQuota, QuotaExceededError } from "@/lib/quota";
import { generateReadingPassage } from "@/lib/ai";
import { getMasteredCardsForDeck } from "@/lib/fsrs";
import { getUserSettings } from "@/lib/settings";
import { annotatePassage } from "@/lib/pinyin-annotate";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const tier = (session.user as { tier?: string }).tier ?? "FREE";

  try {
    await checkQuota(userId, "reading", tier as "FREE" | "PREMIUM" | "UNLIMITED");
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: "Quota reading harian habis", resetAt: err.resetAt },
        { status: 429 }
      );
    }
    throw err;
  }

  try {
    // Whitelist vocab: deck yang dipilih di Settings (targetDeckId). Fallback global.
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const topic =
      typeof body?.topic === "string" && body.topic.trim() ? body.topic.trim() : undefined;

    const settings = await getUserSettings(prisma, userId);
    const masteredWords = await getMasteredCardsForDeck(userId, settings.targetDeckId);
    const reading = await generateReadingPassage(masteredWords, topic);
    const tokens = annotatePassage(reading.passage);

    // Persist passage + pertanyaan (beserta kunci jawaban) untuk riwayat baca.
    // Best-effort: kalau penyimpanan gagal, hasil generate TETAP dikembalikan ke
    // user — riwayat hanyalah pelengkap, bukan blocker flow utama.
    let readingSessionId: string | null = null;
    try {
      const saved = await prisma.readingSession.create({
        data: {
          userId,
          topic: topic ?? null,
          passage: reading.passage,
          translation: reading.translation,
          tokens: tokens as unknown as Prisma.InputJsonValue,
          questions: {
            create: reading.questions.map((q) => ({
              question: q.question,
              options: q.options,
              answer: q.correctIndex,
            })),
          },
        },
        select: { id: true },
      });
      readingSessionId = saved.id;
    } catch (err) {
      console.error("reading save error (non-blocking):", err);
    }

    return NextResponse.json({
      ...reading,
      tokens,
      readingSessionId,
    });
  } catch (err) {
    console.error("reading route error:", err);
    return NextResponse.json(
      { error: "Gagal membuat latihan baca, coba lagi sebentar lagi." },
      { status: 502 }
    );
  }
}

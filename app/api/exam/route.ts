// app/api/exam/route.ts
// Dipegang oleh: ai-integration-agent + srs-engine-agent
// Generate soal simulasi ujian dari kartu mastered, auto-grade dilakukan client-side
// untuk MVP (belum ada tabel sesi ujian di schema untuk simpan correctIndex server-side).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkQuota, QuotaExceededError } from "@/lib/quota";
import { generateExamQuestions } from "@/lib/ai";
import { getMasteredCards } from "@/lib/fsrs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const tier = (session.user as { tier?: string }).tier ?? "FREE";

  try {
    await checkQuota(userId, "exam", tier as "FREE" | "PREMIUM" | "UNLIMITED");
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: "Quota exam harian habis", resetAt: err.resetAt },
        { status: 429 }
      );
    }
    throw err;
  }

  // TODO(srs-engine-agent): setelah user submit jawaban, hasil grading sebaiknya
  //   mempengaruhi rating FSRS kartu terkait (lewat endpoint terpisah, mis.
  //   POST /api/exam/grade, atau extend endpoint ini). Belum diimplementasikan —
  //   butuh mapping soal -> cardId yang belum ada di struktur ExamQuestion saat ini.

  try {
    // Whitelist vocab: fallback "semua Card mastered lintas deck" (belum ada konsep
    // active deck sampai Fase 1.5 selesai — lihat lib/deck.ts). Ganti ke deck-scoped
    // begitu Fase 1.5 (custom deck) landing.
    const masteredWords = await getMasteredCards(userId);
    const exam = await generateExamQuestions(masteredWords);
    return NextResponse.json(exam);
  } catch (err) {
    console.error("exam route error:", err);
    return NextResponse.json(
      { error: "Gagal membuat soal ujian, coba lagi sebentar lagi." },
      { status: 502 }
    );
  }
}

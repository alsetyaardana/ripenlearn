// app/api/reading/route.ts
// Dipegang oleh: ai-integration-agent
// Generate paragraf latihan baca dari vocab mastered only + pertanyaan pemahaman.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkQuota, QuotaExceededError } from "@/lib/quota";
import { generateReadingPassage } from "@/lib/ai";
import { getMasteredCards } from "@/lib/fsrs";

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
    // Whitelist vocab: fallback "semua Card mastered lintas deck" (belum ada konsep
    // active deck sampai Fase 1.5 selesai — lihat lib/deck.ts). Ganti ke deck-scoped
    // begitu Fase 1.5 (custom deck) landing.
    const masteredWords = await getMasteredCards(userId);
    const reading = await generateReadingPassage(masteredWords);
    return NextResponse.json(reading);
  } catch (err) {
    console.error("reading route error:", err);
    return NextResponse.json(
      { error: "Gagal membuat latihan baca, coba lagi sebentar lagi." },
      { status: 502 }
    );
  }
}

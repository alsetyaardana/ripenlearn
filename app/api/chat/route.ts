// app/api/chat/route.ts
// Dipegang oleh: ai-integration-agent
// Chat constrained ke mastered vocab user. WAJIB cek quota sebelum call DeepSeek.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkQuota, QuotaExceededError } from "@/lib/quota";
import { chatWithConstrainedVocab } from "@/lib/ai";
import { getMasteredCardsForDeck } from "@/lib/fsrs";
import { getUserSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const tier = session.user.tier ?? "FREE";

  try {
    await checkQuota(userId, "chat", tier);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: "Quota chat harian habis", resetAt: err.resetAt },
        { status: 429 }
      );
    }
    throw err;
  }

  const body = await req.json().catch(() => null);
  const message = body?.message as string | undefined;
  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "Invalid body: expected { message: string }" },
      { status: 400 }
    );
  }

  try {
    // Vocab source: deck yang dipilih di Settings (targetDeckId). Fallback global.
    const settings = await getUserSettings(prisma, userId);
    const masteredWords = await getMasteredCardsForDeck(userId, settings.targetDeckId);
    const reply = await chatWithConstrainedVocab(masteredWords, message);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("chat route error:", err);
    return NextResponse.json(
      { error: "Gagal menghubungi AI, coba lagi sebentar lagi." },
      { status: 502 }
    );
  }
}

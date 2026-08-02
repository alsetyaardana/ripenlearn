// app/api/chat/route.ts
// Dipegang oleh: ai-integration-agent
// Chat constrained ke mastered vocab user. WAJIB cek quota sebelum call DeepSeek.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkQuota, QuotaExceededError } from "@/lib/quota";
import { chatWithConstrainedVocab } from "@/lib/ai";
import { getMasteredCards } from "@/lib/fsrs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const tier = (session.user as any).tier ?? "FREE";

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
    const masteredWords = await getMasteredCards(userId);
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

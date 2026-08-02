// app/api/reading/route.ts
// Dipegang oleh: ai-integration-agent
// Generate paragraf latihan baca dari vocab mastered only + pertanyaan pemahaman.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkQuota, QuotaExceededError } from "@/lib/quota";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const tier = (session.user as any).tier ?? "FREE";

  try {
    await checkQuota(userId, "reading", tier);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: "Quota reading harian habis", resetAt: err.resetAt },
        { status: 429 }
      );
    }
    throw err;
  }

  // TODO(ai-integration-agent): implementasikan generateReadingPassage() di lib/ai.ts

  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

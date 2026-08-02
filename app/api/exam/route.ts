// app/api/exam/route.ts
// Dipegang oleh: ai-integration-agent + srs-engine-agent
// Generate soal simulasi ujian dari kartu due/mastered, auto-grade, update FSRS.

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

  // TODO(ai-integration-agent): implementasikan generateExamQuestions() di lib/ai.ts
  // TODO(srs-engine-agent): setelah user submit jawaban, hasil grading mempengaruhi
  //   rating FSRS kartu terkait (lewat endpoint terpisah atau di sini sekalian)

  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

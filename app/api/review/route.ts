// app/api/review/route.ts
// Dipegang oleh: srs-engine-agent
// Endpoint submit rating review & update CardProgress.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO(srs-engine-agent):
  // 1. Parse body: { cardId, rating: "again"|"hard"|"good"|"easy" }
  // 2. Ambil CardProgress existing (atau buat baru kalau belum ada)
  // 3. Hitung state baru pakai lib/fsrs.ts -> scheduleReview()
  // 4. Update CardProgress dalam satu transaksi Prisma
  // 5. Return progress terbaru

  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

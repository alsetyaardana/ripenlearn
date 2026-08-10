// app/api/deck/[deckId]/cards/browse/route.ts
// GET: browser kartu dalam deck — gabungan Card global (via DeckCard join Card)
// dan CustomCard, lengkap dengan progress user (CardProgress / CustomCardProgress).
// Query: source=all|global|custom, status=all|NEW|LEARNING|REVIEW|MASTERED,
// sort=hanzi|hsk|status|lastReviewed, search, page, pageSize.
// Ownership divalidasi server-side — deck milik user lain / tidak ada -> 404.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeckBrowseCards,
  parseBrowseQuery,
  DeckNotFoundError,
} from "@/lib/card-browser";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deckId } = await params;
  const query = parseBrowseQuery(req.nextUrl.searchParams);

  try {
    const result = await getDeckBrowseCards(prisma, deckId, session.user.id, query);
    return NextResponse.json({
      cards: result.cards.map((c) => ({
        ...c,
        dueDate: c.dueDate ? c.dueDate.toISOString() : null,
        lastReviewedAt: c.lastReviewedAt ? c.lastReviewedAt.toISOString() : null,
        nextReviewAt: c.nextReviewAt ? c.nextReviewAt.toISOString() : null,
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
      hasMore: result.hasMore,
    });
  } catch (err) {
    if (err instanceof DeckNotFoundError) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    console.error("deck browse route error:", err);
    return NextResponse.json({ error: "Gagal memuat kartu." }, { status: 500 });
  }
}

// app/api/deck/levels/route.ts
// Material picker untuk detail deck:
//   GET /api/deck/levels?deckId=<id>
//   - Deck HSK resmi (kartu global hskLevel 1-7) -> { kind: "hsk", levels: [{level,count}] }
//   - Deck Daily Talk (hskLevel=8)              -> { kind: "category", categories: [{category,count}] }
// Count = kartu global yang BELUM ada di deck (yang bisa ditambahkan), bukan total kurikulum.
// deckId opsional: tanpa deckId dikembalikan levels HSK (default historis).
// Deck yang tidak ada / bukan milik user -> 404 (sama seperti route deck lain).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DeckNotFoundError,
  getDeckCardCountsByCategory,
  getDeckCardCountsByHskLevel,
  getDeckCurriculumKind,
} from "@/lib/deck";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deckId = req.nextUrl.searchParams.get("deckId");

  try {
    if (deckId) {
      const kind = await getDeckCurriculumKind(prisma, deckId);
      // getDeckCurriculumKind hanya melihat kartu global deck; pastikan deck
      // benar-benar milik user (404 untuk non-pemilik / tidak ada).
      const deck = await prisma.deck.findUnique({
        where: { id: deckId },
        select: { userId: true },
      });
      if (!deck || deck.userId !== session.user.id) {
        throw new DeckNotFoundError();
      }
      if (kind === "category") {
        const categories = await getDeckCardCountsByCategory(prisma, deckId);
        return NextResponse.json({ kind, categories });
      }
      const levels = await getDeckCardCountsByHskLevel(prisma, deckId);
      return NextResponse.json({ kind, levels });
    }

    // Tanpa deckId: levels global HSK 1-7 (default historis).
    const globalLevels = await prisma.card.groupBy({
      by: ["hskLevel"],
      where: { hskLevel: { lte: 7 } },
      _count: { _all: true },
    });
    const levels = globalLevels.map((g) => ({ level: g.hskLevel, count: g._count._all })).sort((a, b) => a.level - b.level);
    return NextResponse.json({ kind: "hsk", levels });
  } catch (err) {
    if (err instanceof DeckNotFoundError) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    console.error("deck levels route error:", err);
    return NextResponse.json({ error: "Gagal memuat materi deck." }, { status: 500 });
  }
}

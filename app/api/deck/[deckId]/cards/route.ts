// app/api/deck/[deckId]/cards/route.ts
// Tambah kartu ke deck. Tiga mode payload:
//   1. { cardIds: string[] } — subset Card global spesifik (search UI)
//   2. { hskLevel: number[] } — SEMUA Card global pada level HSK tertentu (bulk)
//   3. { categories: string[] } — SEMUA Card Daily Talk pada kategori tema tertentu (bulk)
// Ownership divalidasi server-side; semua idempotent (skipDuplicates).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addCategoryToDeck,
  addGlobalCardsToDeck,
  addHskLevelToDeck,
  DeckNotFoundError,
  validateCardIdsPayload,
  validateCategoriesPayload,
  validateHskLevelsPayload,
} from "@/lib/deck";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deckId } = await params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const cardIds = validateCardIdsPayload(body);
  const hskLevels = validateHskLevelsPayload(body);
  const categories = validateCategoriesPayload(body);

  try {
    if (cardIds.ok) {
      await addGlobalCardsToDeck(prisma, deckId, session.user.id, cardIds.value.cardIds);
      return NextResponse.json({ ok: true });
    }
    if (hskLevels.ok) {
      const result = await addHskLevelToDeck(prisma, deckId, session.user.id, hskLevels.value.hskLevels);
      return NextResponse.json({ ok: true, added: result.added });
    }
    if (categories.ok) {
      let added = 0;
      for (const category of categories.value.categories) {
        const result = await addCategoryToDeck(prisma, deckId, session.user.id, category);
        added += result.added;
      }
      return NextResponse.json({ ok: true, added });
    }
    return NextResponse.json(
      {
        error:
          "Invalid body: expected { cardIds: string[] }, { hskLevel: number[] }, atau { categories: string[] }",
      },
      { status: 400 }
    );
  } catch (err) {
    if (err instanceof DeckNotFoundError) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    console.error("deck cards route error:", err);
    return NextResponse.json({ error: "Gagal menambah kartu." }, { status: 500 });
  }
}

// app/api/deck/[deckId]/route.ts
// Hapus deck milik user. Ownership divalidasi server-side — user lain / deck
// yang tidak ada mendapat 404 yang sama (tidak membocorkan metadata).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteDeck, DeckNotFoundError } from "@/lib/deck";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deckId } = await params;

  try {
    await deleteDeck(prisma, deckId, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DeckNotFoundError) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    console.error("deck delete route error:", err);
    return NextResponse.json({ error: "Gagal menghapus deck." }, { status: 500 });
  }
}

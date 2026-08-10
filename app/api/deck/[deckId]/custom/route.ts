// app/api/deck/[deckId]/custom/route.ts
// Tambah custom card buatan user ke deck. Ownership divalidasi server-side.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addCustomCardToDeck, DeckNotFoundError } from "@/lib/deck";

interface CustomCardPayload {
  hanzi?: unknown;
  pinyin?: unknown;
  arti?: unknown;
  hskLevel?: unknown;
  exampleSentence?: unknown;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deckId } = await params;

  const body = (await req.json().catch(() => null)) as CustomCardPayload | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const hanzi = typeof body.hanzi === "string" ? body.hanzi.trim() : "";
  const pinyin = typeof body.pinyin === "string" ? body.pinyin.trim() : "";
  const arti = typeof body.arti === "string" ? body.arti.trim() : "";
  if (!hanzi || !pinyin || !arti) {
    return NextResponse.json(
      { error: "Invalid body: expected { hanzi, pinyin, arti } (wajib string non-empty)" },
      { status: 400 }
    );
  }

  const hskLevel =
    typeof body.hskLevel === "number" && Number.isInteger(body.hskLevel) && body.hskLevel >= 1
      ? body.hskLevel
      : undefined;
  const exampleSentence =
    typeof body.exampleSentence === "string" ? body.exampleSentence : undefined;

  try {
    const card = await addCustomCardToDeck(prisma, deckId, session.user.id, {
      hanzi,
      pinyin,
      arti,
      hskLevel,
      exampleSentence,
    });
    return NextResponse.json({ card }, { status: 201 });
  } catch (err) {
    if (err instanceof DeckNotFoundError) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    console.error("deck custom route error:", err);
    return NextResponse.json({ error: "Gagal menambah kartu custom." }, { status: 500 });
  }
}

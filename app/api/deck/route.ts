// app/api/deck/route.ts
// Dipegang oleh: srs-engine-agent
// CRUD deck: create deck, list deck milik user, tambah/hapus card (global & custom).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createDeck,
  listDecksForUser,
  validateDeckPayload,
  type DeckSummary,
} from "@/lib/deck";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decks = await listDecksForUser(session.user.id);
  return NextResponse.json({ decks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = validateDeckPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const deck = await createDeck(
      session.user.id,
      parsed.value.name,
      parsed.value.description,
      prisma
    );
    const summary: DeckSummary = {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      kind: deck.kind,
      hskCardCount: 0,
      chunkCardCount: 0,
      customCardCount: 0,
      totalCardCount: 0,
    };
    return NextResponse.json({ deck: summary }, { status: 201 });
  } catch (err) {
    console.error("deck create route error:", err);
    return NextResponse.json({ error: "Gagal membuat deck." }, { status: 500 });
  }
}

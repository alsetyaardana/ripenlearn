// app/api/deck/route.ts
// Dipegang oleh: srs-engine-agent
// CRUD deck: create deck, list deck milik user, tambah/hapus card (global & custom).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO(srs-engine-agent): list semua deck milik user (lib/deck.ts)
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO(srs-engine-agent): parse body { name, description }, panggil createDeck()
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

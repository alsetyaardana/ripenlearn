// app/api/cards/route.ts
// Pencarian Card global (HSK 3.0) untuk dipilih saat populate deck.
// Query: ?q=hanzi/pinyin&hskLevel=1..9 (opsional). Dibatasi 50 hasil.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const hskParam = req.nextUrl.searchParams.get("hskLevel");
  const hskLevel = hskParam ? Number(hskParam) : undefined;
  if (hskLevel !== undefined && (!Number.isInteger(hskLevel) || hskLevel < 1 || hskLevel > 9)) {
    return NextResponse.json({ error: "hskLevel harus 1-9" }, { status: 400 });
  }

  const where = {
    ...(hskLevel !== undefined ? { hskLevel } : {}),
    ...(q ? { OR: [{ hanzi: { contains: q } }, { pinyin: { contains: q.toLowerCase() } }] } : {}),
  };

  const cards = await prisma.card.findMany({
    where,
    take: 50,
    orderBy: [{ hskLevel: "asc" }, { hanzi: "asc" }],
    select: {
      id: true,
      hanzi: true,
      pinyin: true,
      artiId: true,
      hskLevel: true,
      tipe: true,
    },
  });

  return NextResponse.json({ cards });
}

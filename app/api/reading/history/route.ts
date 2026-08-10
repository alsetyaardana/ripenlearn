// app/api/reading/history/route.ts
// GET — daftar riwayat latihan baca user (metadata: id, topic, preview passage, createdAt).
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const sessions = await prisma.readingSession.findMany({
    where: { userId },
    select: { id: true, topic: true, passage: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      topic: s.topic,
      preview: s.passage.replace(/\s+/g, " ").trim().slice(0, 80),
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

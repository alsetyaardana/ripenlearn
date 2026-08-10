// app/api/chat/sessions/route.ts
// GET — list sesi chat user (metadata saja). POST — buat sesi baru { title }.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      messageCount: s._count.messages,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title =
    typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Chat baru";

  const created = await prisma.chatSession.create({
    data: { userId, title },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(
    {
      session: {
        id: created.id,
        title: created.title,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        messageCount: 0,
      },
    },
    { status: 201 }
  );
}

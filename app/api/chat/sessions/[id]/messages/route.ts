// app/api/chat/sessions/[id]/messages/route.ts
// POST — tambah pesan ke sesi { role, content }. Update updatedAt sesi via touch.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const role = body?.role;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if ((role !== "user" && role !== "assistant") || !content) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const owned = await prisma.chatSession.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const created = await prisma.chatMessage.create({
    data: { sessionId: id, role, content },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  // Bump updatedAt sesi supaya sort "recent first" di daftar sesi tetap akurat.
  await prisma.chatSession.update({
    where: { id },
    data: {},
  });

  return NextResponse.json(
    {
      message: {
        id: created.id,
        role: created.role,
        content: created.content,
        createdAt: created.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}

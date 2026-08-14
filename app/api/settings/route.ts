// app/api/settings/route.ts
// Endpoint Pengaturan Belajar: GET baca setting user, PUT update setting user.
// Ownership selalu dari session (userId server-side) — body tidak pernah membawa
// userId, jadi user tidak bisa mengubah setting milik orang lain.
//
// Response shape:
//   GET  -> { settings: { targetHskLevel, targetDate, newCardsPerDay } }
//   PUT  -> { settings: {...} } (setelah update)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserSettings,
  hasUserSettings,
  updateUserSettings,
  validateSettingsPayload,
} from "@/lib/settings";

function toApiShape(s: {
  targetHskLevel: number | null;
  targetCategory: string | null;
  targetDeckId: string | null;
  targetDate: Date | null;
  targetMode: "DATE" | "RATE";
  newCardsPerDay: number;
}) {
  return {
    targetHskLevel: s.targetHskLevel,
    targetCategory: s.targetCategory,
    targetDeckId: s.targetDeckId,
    targetDate: s.targetDate ? s.targetDate.toISOString().slice(0, 10) : null,
    targetMode: s.targetMode,
    newCardsPerDay: s.newCardsPerDay,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [settings, onboarded] = await Promise.all([
      getUserSettings(prisma, session.user.id),
      hasUserSettings(prisma, session.user.id),
    ]);
    return NextResponse.json({ settings: toApiShape(settings), onboarded });
  } catch (err) {
    console.error("settings GET route error:", err);
    return NextResponse.json({ error: "Gagal memuat pengaturan." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = validateSettingsPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const settings = await updateUserSettings(prisma, session.user.id, parsed.value);
    return NextResponse.json({ settings: toApiShape(settings) });
  } catch (err) {
    console.error("settings PUT route error:", err);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan." }, { status: 500 });
  }
}

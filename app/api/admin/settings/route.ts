// app/api/admin/settings/route.ts
// GET — ambil global settings. PATCH — update global settings. Admin only.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

// Ambil atau buat baris GlobalSettings (singleton — selalu 1 baris)
async function getOrCreateSettings() {
  let settings = await prisma.globalSettings.findFirst();
  if (!settings) {
    settings = await prisma.globalSettings.create({ data: {} });
  }
  return settings;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await getOrCreateSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.model === "string") data.model = body.model;
  if (typeof body.systemPromptPrefix === "string") data.systemPromptPrefix = body.systemPromptPrefix;
  if (typeof body.quotaFree === "number" && body.quotaFree >= 0) data.quotaFree = body.quotaFree;
  if (typeof body.quotaPremium === "number" && body.quotaPremium >= 0) data.quotaPremium = body.quotaPremium;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const existing = await getOrCreateSettings();
  const settings = await prisma.globalSettings.update({
    where: { id: existing.id },
    data,
  });

  return NextResponse.json({ settings });
}

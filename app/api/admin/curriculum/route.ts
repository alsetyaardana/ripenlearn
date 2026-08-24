// app/api/admin/curriculum/route.ts
// GET — list data kurikulum dengan filter. PATCH — edit data. Admin only.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CurriculumType = "cards" | "characters" | "topics" | "grammar";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const type = req.nextUrl.searchParams.get("type") as CurriculumType | null;
  const level = req.nextUrl.searchParams.get("level");
  const search = req.nextUrl.searchParams.get("search")?.trim() || "";
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("pageSize") || "50", 10)));
  const skip = (page - 1) * pageSize;

  const hskLevel = level ? parseInt(level, 10) : undefined;

  switch (type) {
    case "cards": {
      const where: Record<string, unknown> = {};
      if (hskLevel) where.hskLevel = hskLevel;
      if (search) {
        where.OR = [
          { hanzi: { contains: search, mode: "insensitive" } },
          { pinyin: { contains: search, mode: "insensitive" } },
          { artiId: { contains: search, mode: "insensitive" } },
          { artiEn: { contains: search, mode: "insensitive" } },
        ];
      }
      const [items, total] = await Promise.all([
        prisma.card.findMany({
          where,
          orderBy: [{ hskLevel: "asc" }, { hanzi: "asc" }],
          skip,
          take: pageSize,
        }),
        prisma.card.count({ where }),
      ]);
      return NextResponse.json({ items, total, page, pageSize });
    }

    case "characters": {
      const where: Record<string, unknown> = {};
      if (hskLevel) where.hskLevel = hskLevel;
      if (search) {
        where.OR = [{ hanzi: { contains: search, mode: "insensitive" } }];
      }
      const [items, total] = await Promise.all([
        prisma.character.findMany({
          where,
          orderBy: [{ hskLevel: "asc" }, { hanzi: "asc" }],
          skip,
          take: pageSize,
        }),
        prisma.character.count({ where }),
      ]);
      return NextResponse.json({ items, total, page, pageSize });
    }

    case "topics": {
      const where: Record<string, unknown> = {};
      if (hskLevel) where.hskLevel = hskLevel;
      if (search) {
        where.OR = [
          { levelOneName: { contains: search, mode: "insensitive" } },
          { levelTwoName: { contains: search, mode: "insensitive" } },
          { levelThreeName: { contains: search, mode: "insensitive" } },
        ];
      }
      const [items, total] = await Promise.all([
        prisma.topic.findMany({
          where,
          orderBy: [{ levelOneName: "asc" }, { levelTwoName: "asc" }, { levelThreeName: "asc" }],
          skip,
          take: pageSize,
        }),
        prisma.topic.count({ where }),
      ]);
      return NextResponse.json({ items, total, page, pageSize });
    }

    case "grammar": {
      const where: Record<string, unknown> = {};
      if (hskLevel) where.hskLevel = hskLevel;
      if (search) {
        where.OR = [
          { category: { contains: search, mode: "insensitive" } },
          { subCategory: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ];
      }
      const [items, total] = await Promise.all([
        prisma.grammarPoint.findMany({
          where,
          orderBy: [{ hskLevel: "asc" }, { category: "asc" }],
          skip,
          take: pageSize,
        }),
        prisma.grammarPoint.count({ where }),
      ]);
      return NextResponse.json({ items, total, page, pageSize });
    }

    default:
      return NextResponse.json({ error: "Invalid type. Use: cards, characters, topics, grammar" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || typeof body.type !== "string" || typeof body.id !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { type, id, ...fields } = body;

  try {
    switch (type) {
      case "cards": {
        const data: Record<string, unknown> = {};
        if (typeof fields.pinyin === "string") data.pinyin = fields.pinyin;
        if (typeof fields.artiId === "string") data.artiId = fields.artiId;
        if (typeof fields.artiEn === "string") data.artiEn = fields.artiEn;
        if (fields.tipe === "SHUXIE" || fields.tipe === "RENDU") data.tipe = fields.tipe;
        if (typeof fields.partOfSpeech === "string") data.partOfSpeech = fields.partOfSpeech;
        if (typeof fields.exampleSentence === "string") data.exampleSentence = fields.exampleSentence;
        if (Object.keys(data).length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });
        const item = await prisma.card.update({ where: { id }, data });
        return NextResponse.json({ item });
      }

      case "characters": {
        const data: Record<string, unknown> = {};
        if (fields.tipe === "SHUXIE" || fields.tipe === "RENDU") data.tipe = fields.tipe;
        if (Object.keys(data).length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });
        const item = await prisma.character.update({ where: { id }, data });
        return NextResponse.json({ item });
      }

      case "topics": {
        const data: Record<string, unknown> = {};
        if (typeof fields.levelOneName === "string") data.levelOneName = fields.levelOneName;
        if (typeof fields.levelTwoName === "string") data.levelTwoName = fields.levelTwoName;
        if (typeof fields.levelThreeName === "string") data.levelThreeName = fields.levelThreeName;
        if (Object.keys(data).length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });
        const item = await prisma.topic.update({ where: { id }, data });
        return NextResponse.json({ item });
      }

      case "grammar": {
        const data: Record<string, unknown> = {};
        if (typeof fields.category === "string") data.category = fields.category;
        if (typeof fields.subCategory === "string") data.subCategory = fields.subCategory;
        if (typeof fields.content === "string") data.content = fields.content;
        if (Object.keys(data).length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });
        const item = await prisma.grammarPoint.update({ where: { id }, data });
        return NextResponse.json({ item });
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
}

// scripts/import-grammar.ts
// Import 语法大纲 (Grammar Syllabus) dari HSK 3.0 ke tabel GrammarPoint.
//
// Sumber data: data/grammar.json, dihasilkan dari data/hsk_bbox.xml lewat
// scripts/_parse/parse_grammar.py. Regenerasi kalau perlu:
//   pdftotext -bbox-layout data/decrypted.pdf data/hsk_bbox.xml
//   python3 scripts/_parse/parse_grammar.py
//
// KNOWN LIMITATION (lihat docstring parse_grammar.py untuk detail): tabel
// sumber punya 4 kolom visual (类别/类别名称/细目/语法内容) dengan 类别 dan
// 类别名称 merged-cell yang labelnya kadang dirender center-aligned di
// tengah row-span-nya, bukan di baris pertama. `content` di sini adalah
// gabungan (newline-joined) semua fragमen 细目+语法内容 di bawah satu
// (hskLevel, category, subCategory) — di batas antar grup, 1-2 baris kadang
// bisa nyasar ke grup sebelum/sesudahnya (sudah di-spot-check, kelihatan
// benar untuk sampel yang dicek, tapi tetap perlu review manual).
//
// GrammarPoint TIDAK punya @@unique constraint eksplisit. Dedup key yang
// dipakai: (hskLevel, category, subCategory) — kalau butuh unique constraint
// asli di skema, itu perlu dikonfirmasi user dulu, bukan diubah sepihak.
//
// GrammarPoint global/shared, tidak butuh translation review.
//
// Jalankan: npx tsx scripts/import-grammar.ts

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface GrammarEntry {
  hskLevel: number;
  category: string;
  subCategory: string;
  content: string;
}

async function main() {
  const dataPath = path.join(process.cwd(), "data", "grammar.json");
  if (!fs.existsSync(dataPath)) {
    console.error(
      `File ${dataPath} tidak ditemukan. Jalankan dulu:\n` +
        `  pdftotext -bbox-layout data/decrypted.pdf data/hsk_bbox.xml\n` +
        `  python3 scripts/_parse/parse_grammar.py`
    );
    process.exit(1);
  }

  const entries: GrammarEntry[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  let created = 0;
  let updated = 0;
  for (const entry of entries) {
    const existing = await prisma.grammarPoint.findFirst({
      where: {
        hskLevel: entry.hskLevel,
        category: entry.category,
        subCategory: entry.subCategory,
      },
    });
    if (existing) {
      await prisma.grammarPoint.update({
        where: { id: existing.id },
        data: { content: entry.content },
      });
      updated++;
    } else {
      await prisma.grammarPoint.create({ data: entry });
      created++;
    }
  }

  const total = await prisma.grammarPoint.count();
  const byLevel = await prisma.grammarPoint.groupBy({
    by: ["hskLevel"],
    _count: true,
    orderBy: { hskLevel: "asc" },
  });
  const samples = await prisma.grammarPoint.findMany({ take: 5 });

  console.log(`\n=== GrammarPoint import summary ===`);
  console.log(`Parsed entries: ${entries.length}`);
  console.log(`Created: ${created}, Updated: ${updated}`);
  console.log(`Total GrammarPoint rows in DB: ${total}`);
  console.log(`Breakdown per hskLevel:`);
  for (const row of byLevel) {
    console.log(`  level ${row.hskLevel}: ${row._count}`);
  }
  console.log(`Sample entries:`);
  for (const s of samples) {
    console.log(`  [L${s.hskLevel}] ${s.category} / ${s.subCategory}: ${s.content.slice(0, 40)}...`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

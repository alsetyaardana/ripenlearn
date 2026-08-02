// scripts/import-topics.ts
// Import 话题大纲 (Topic Syllabus) dari HSK 3.0 ke tabel Topic.
//
// Sumber data: data/topics.json, dihasilkan dari data/hsk_bbox.xml
// (pdftotext -bbox-layout data/decrypted.pdf data/hsk_bbox.xml) lewat
// scripts/_parse/parse_topics.py. Regenerasi kalau perlu:
//   pdftotext -bbox-layout data/decrypted.pdf data/hsk_bbox.xml
//   python3 scripts/_parse/parse_topics.py
//
// Lihat docstring di scripts/_parse/parse_topics.py untuk detail teknik
// ekstraksi (nearest-neighbor assignment untuk merged-cell 一级/二级话题) dan
// known limitation-nya (kadang salah assign 1-2 baris di batas antar grup).
//
// Topic global/shared untuk semua user — upsert berdasarkan unique constraint
// [levelOneName, levelTwoName, levelThreeName], idempotent.
//
// Jalankan: npx tsx scripts/import-topics.ts

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface TopicEntry {
  hskLevel: number;
  levelOneName: string;
  levelTwoName: string;
  levelThreeName: string;
}

async function main() {
  const dataPath = path.join(process.cwd(), "data", "topics.json");
  if (!fs.existsSync(dataPath)) {
    console.error(
      `File ${dataPath} tidak ditemukan. Jalankan dulu:\n` +
        `  pdftotext -bbox-layout data/decrypted.pdf data/hsk_bbox.xml\n` +
        `  python3 scripts/_parse/parse_topics.py`
    );
    process.exit(1);
  }

  const entries: TopicEntry[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  let created = 0;
  let updated = 0;
  for (const entry of entries) {
    const existing = await prisma.topic.findUnique({
      where: {
        levelOneName_levelTwoName_levelThreeName: {
          levelOneName: entry.levelOneName,
          levelTwoName: entry.levelTwoName,
          levelThreeName: entry.levelThreeName,
        },
      },
    });
    if (existing) {
      await prisma.topic.update({
        where: { id: existing.id },
        data: { hskLevel: entry.hskLevel },
      });
      updated++;
    } else {
      await prisma.topic.create({ data: entry });
      created++;
    }
  }

  const total = await prisma.topic.count();
  const byLevel = await prisma.topic.groupBy({
    by: ["hskLevel"],
    _count: true,
    orderBy: { hskLevel: "asc" },
  });
  const samples = await prisma.topic.findMany({ take: 5 });

  console.log(`\n=== Topic import summary ===`);
  console.log(`Parsed entries: ${entries.length}`);
  console.log(`Created: ${created}, Updated: ${updated}`);
  console.log(`Total Topic rows in DB: ${total}`);
  console.log(`Breakdown per hskLevel:`);
  for (const row of byLevel) {
    console.log(`  level ${row.hskLevel}: ${row._count}`);
  }
  console.log(`Sample entries:`);
  for (const s of samples) {
    console.log(`  [L${s.hskLevel}] ${s.levelOneName} > ${s.levelTwoName} > ${s.levelThreeName}`);
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

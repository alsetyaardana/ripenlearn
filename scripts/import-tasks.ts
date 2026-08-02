// scripts/import-tasks.ts
// Import 任务大纲 (Task Syllabus) dari HSK 3.0 ke tabel Task.
//
// Sumber data: data/tasks.json, dihasilkan dari data/hsk_bbox.xml lewat
// scripts/_parse/parse_tasks.py. Regenerasi kalau perlu:
//   pdftotext -bbox-layout data/decrypted.pdf data/hsk_bbox.xml
//   python3 scripts/_parse/parse_tasks.py
//
// KNOWN LIMITATIONS (lihat docstring parse_tasks.py untuk detail):
// - skillType (LISTENING/SPEAKING/READING/WRITING) di-infer dari kata kerja
//   pembuka tiap bullet (heuristik keyword), bukan ditandai eksplisit di
//   sumber — approximate, terutama untuk level 7-9 yang sumbernya sendiri
//   terstruktur per dimensi 理解/表达/翻译, bukan per 听/说/读/写.
// - Level 7-9 digabung jadi satu section di sumber ("HSK（七—九级）任务"); semua
//   task di section itu di-tag hskLevel=7 (terendah dari rentang), karena
//   sumber tidak menyebutkan level pasti 7/8/9 per task.
//
// Task TIDAK punya @@unique constraint eksplisit di schema.prisma (lihat
// catatan skema). Dedup key yang dipakai di sini: (hskLevel, category,
// description) — kalau menurut siapa pun yang review ini butuh unique
// constraint asli di skema, itu keputusan schema change yang butuh
// konfirmasi eksplisit user dulu (lihat CLAUDE.md), BUKAN diubah sepihak di
// sini.
//
// Task global/shared, tidak butuh translation review.
//
// Jalankan: npx tsx scripts/import-tasks.ts

import { PrismaClient, SkillType } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface TaskEntry {
  hskLevel: number;
  category: string;
  description: string;
  skillType: SkillType;
}

async function main() {
  const dataPath = path.join(process.cwd(), "data", "tasks.json");
  if (!fs.existsSync(dataPath)) {
    console.error(
      `File ${dataPath} tidak ditemukan. Jalankan dulu:\n` +
        `  pdftotext -bbox-layout data/decrypted.pdf data/hsk_bbox.xml\n` +
        `  python3 scripts/_parse/parse_tasks.py`
    );
    process.exit(1);
  }

  const entries: TaskEntry[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  let created = 0;
  let updated = 0;
  for (const entry of entries) {
    const existing = await prisma.task.findFirst({
      where: {
        hskLevel: entry.hskLevel,
        category: entry.category,
        description: entry.description,
      },
    });
    if (existing) {
      await prisma.task.update({
        where: { id: existing.id },
        data: { skillType: entry.skillType },
      });
      updated++;
    } else {
      await prisma.task.create({ data: entry });
      created++;
    }
  }

  const total = await prisma.task.count();
  const byLevel = await prisma.task.groupBy({
    by: ["hskLevel", "skillType"],
    _count: true,
    orderBy: [{ hskLevel: "asc" }, { skillType: "asc" }],
  });
  const samples = await prisma.task.findMany({ take: 5 });

  console.log(`\n=== Task import summary ===`);
  console.log(`Parsed entries: ${entries.length}`);
  console.log(`Created: ${created}, Updated: ${updated}`);
  console.log(`Total Task rows in DB: ${total}`);
  console.log(`Breakdown per hskLevel + skillType:`);
  for (const row of byLevel) {
    console.log(`  level ${row.hskLevel} / ${row.skillType}: ${row._count}`);
  }
  console.log(`Sample entries:`);
  for (const s of samples) {
    console.log(`  [L${s.hskLevel}/${s.skillType}] ${s.category}: ${s.description.slice(0, 40)}...`);
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

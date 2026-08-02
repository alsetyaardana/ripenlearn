// scripts/import-characters.ts
// Import 汉字大纲 (Character Syllabus) dari HSK 3.0 ke tabel Character.
//
// Sumber data: data/characters.json, dihasilkan dari data/hsk_bbox.xml lewat
// scripts/_parse/parse_characters.py. Regenerasi kalau perlu:
//   pdftotext -bbox-layout data/decrypted.pdf data/hsk_bbox.xml
//   python3 scripts/_parse/parse_characters.py
//
// KNOWN LIMITATION (lihat docstring parse_characters.py): dua section header
// di sumber mencakup rentang level gabungan ("HSK（一级）~（二级）书写字" dan
// "HSK（七—九级）认读字/书写字"), bukan level tunggal — karakter di rentang itu
// di-tag ke level TERENDAH dalam rentang tsb (konvensi kumulatif), bukan level
// pasti tempat karakter itu pertama kali muncul. Perlu di-cross-check manual
// kalau butuh presisi per-level di rentang 1-2 atau 7-9.
//
// Character global/shared — upsert berdasarkan unique constraint
// [hanzi, hskLevel, tipe], idempotent. Tidak butuh translation review (tidak
// ada field artiId/artiEn di model ini).
//
// Jalankan: npx tsx scripts/import-characters.ts

import { PrismaClient, CharacterType } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface CharEntry {
  hanzi: string;
  hskLevel: number;
  tipe: CharacterType;
}

async function main() {
  const dataPath = path.join(process.cwd(), "data", "characters.json");
  if (!fs.existsSync(dataPath)) {
    console.error(
      `File ${dataPath} tidak ditemukan. Jalankan dulu:\n` +
        `  pdftotext -bbox-layout data/decrypted.pdf data/hsk_bbox.xml\n` +
        `  python3 scripts/_parse/parse_characters.py`
    );
    process.exit(1);
  }

  const entries: CharEntry[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  let upserted = 0;
  for (const entry of entries) {
    await prisma.character.upsert({
      where: {
        hanzi_hskLevel_tipe: {
          hanzi: entry.hanzi,
          hskLevel: entry.hskLevel,
          tipe: entry.tipe,
        },
      },
      update: {},
      create: entry,
    });
    upserted++;
  }

  const total = await prisma.character.count();
  const byLevel = await prisma.character.groupBy({
    by: ["hskLevel", "tipe"],
    _count: true,
    orderBy: [{ hskLevel: "asc" }, { tipe: "asc" }],
  });
  const samples = await prisma.character.findMany({ take: 5 });

  console.log(`\n=== Character import summary ===`);
  console.log(`Parsed entries: ${entries.length}, upserted: ${upserted}`);
  console.log(`Total Character rows in DB: ${total}`);
  console.log(`Breakdown per hskLevel + tipe:`);
  for (const row of byLevel) {
    console.log(`  level ${row.hskLevel} / ${row.tipe}: ${row._count}`);
  }
  console.log(`Sample entries:`);
  for (const s of samples) {
    console.log(`  ${s.hanzi} (level ${s.hskLevel}, ${s.tipe})`);
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

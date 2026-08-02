// scripts/import-vocab.ts
// Import vocabulary (词汇大纲) dari dokumen resmi HSK 3.0 ke tabel Card.
//
// Pipeline lengkap (lihat scripts/_parse/*.py untuk detail & known limitations):
//   1. qpdf --decrypt docs/HSK-3.0-Syllabus-source.pdf data/decrypted.pdf
//   2. pdftotext -bbox-layout data/decrypted.pdf data/hsk_bbox.xml
//   3. python3 scripts/_parse/parse_characters.py   # duluan — Card.tipe di
//                                                     # bawah di-derive dari sini
//   4. python3 scripts/_parse/parse_vocab.py         # -> data/vocab-parsed.json
//   5. npx tsx scripts/import-vocab.ts               # script ini
//
// Step 5 SELALU regenerate data/vocab-draft.json dari data/vocab-parsed.json +
// data/vocab-translations-l{N}.json per level (draft translation AI-assisted,
// ditulis langsung dari pengetahuan Mandarin model — TANPA panggilan
// network/API apa pun, sesuai batasan task; sumbernya
// scripts/_parse/vocab_translations_l{N}.py, di-export ke JSON lewat
// scripts/_parse/export_translations.py). Field artiId/artiEn TIDAK ada di
// dokumen sumber (hanya Mandarin + pinyin + 词性) — lihat docs/README.md dan
// CLAUDE.md bagian data model.
//
// HARD RULE (CLAUDE.md): konten kurikulum hasil auto-translate TIDAK BOLEH
// masuk ke tabel Card tanpa direview manusia. Maka:
//   - Step 5 HANYA menulis data/vocab-draft.json (semua entry needsReview:true).
//   - Upsert ke Card HANYA jalan kalau data/vocab-reviewed.json ada (hasil
//     review manual — array dengan format sama seperti vocab-draft.json, tapi
//     artiId/artiEn sudah diisi/dikoreksi manusia). Kalau file itu belum ada,
//     script exit 0 setelah regenerate draft, TANPA insert apa pun ke Card.
//   - Pass --from-reviewed <path> untuk pakai file reviewed custom.
//
// KNOWN LIMITATION saat ini: draft translation mencakup HSK level 1-2 penuh
// (300 + 198 entry) — lihat scripts/_parse/vocab_translations_l1.py dan
// vocab_translations_l2.py. Level 3-9 tetap muncul di vocab-draft.json dengan
// artiId/artiEn kosong dan translationPending:true (bukan di-drop), supaya
// reviewer bisa lihat seluruh vocab yang berhasil di-parse strukturnya, dan
// menambah translation level lanjutan tinggal nambah lookup table baru
// (vocab_translations_l{N}.py) + re-run export_translations.py, tanpa perlu
// re-run ekstraksi PDF dari awal.
//
// tipe (SHUXIE/RENDU) DIDERIVE dari Character syllabus (kata dianggap SHUXIE
// hanya kalau semua karakter penyusunnya ada di set 书写字) karena tabel vocab
// sumber TIDAK punya kolom ini secara eksplisit — lihat parse_vocab.py. Ini
// keputusan/heuristik yang didokumentasikan, bukan dari kolom source langsung.

import { PrismaClient, CardType } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface ParsedVocab {
  hanzi: string;
  pinyin: string;
  hskLevel: number;
  extraLevelNote: string | null;
  partOfSpeech: string;
  tipe: CardType;
}

interface DraftVocab extends ParsedVocab {
  artiId: string;
  artiEn: string;
  needsReview: boolean;
  translationPending: boolean;
}

interface ReviewedVocab {
  hanzi: string;
  pinyin: string;
  artiId: string;
  artiEn: string;
  hskLevel: number;
  extraLevelNote?: string | null;
  partOfSpeech: string;
  tipe: CardType;
  exampleSentence?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const PARSED_PATH = path.join(DATA_DIR, "vocab-parsed.json");
const DRAFT_PATH = path.join(DATA_DIR, "vocab-draft.json");

// Draft translations are authored by hand per HSK level in
// scripts/_parse/vocab_translations_l{N}.py (no network/API calls, see
// CLAUDE.md), then exported to data/vocab-translations-l{N}.json by
// scripts/_parse/export_translations.py. Levels without an exported JSON
// file simply stay translationPending:true here -- coverage can be extended
// level by level without touching this script.
function loadLevelTranslations(): Map<number, Record<string, [string, string]>> {
  const byLevel = new Map<number, Record<string, [string, string]>>();
  for (let level = 1; level <= 9; level++) {
    const p = path.join(DATA_DIR, `vocab-translations-l${level}.json`);
    if (fs.existsSync(p)) {
      byLevel.set(level, JSON.parse(fs.readFileSync(p, "utf-8")));
    }
  }
  return byLevel;
}

function regenerateDraft(): DraftVocab[] {
  const parsed: ParsedVocab[] = JSON.parse(fs.readFileSync(PARSED_PATH, "utf-8"));
  const translationsByLevel = loadLevelTranslations();

  const draft: DraftVocab[] = parsed.map((e) => {
    const levelTranslations = translationsByLevel.get(e.hskLevel);
    const tr = levelTranslations ? levelTranslations[e.hanzi] : undefined;
    return {
      ...e,
      artiId: tr ? tr[0] : "",
      artiEn: tr ? tr[1] : "",
      needsReview: true,
      translationPending: !tr,
    };
  });

  fs.writeFileSync(DRAFT_PATH, JSON.stringify(draft, null, 2), "utf-8");
  return draft;
}

async function main() {
  const args = process.argv.slice(2);
  const fromReviewedIdx = args.indexOf("--from-reviewed");
  const reviewedPath =
    fromReviewedIdx !== -1 && args[fromReviewedIdx + 1]
      ? path.resolve(args[fromReviewedIdx + 1])
      : path.join(DATA_DIR, "vocab-reviewed.json");

  if (!fs.existsSync(PARSED_PATH)) {
    console.error(
      `File ${PARSED_PATH} tidak ditemukan. Jalankan dulu pipeline ekstraksi:\n` +
        `  qpdf --decrypt docs/HSK-3.0-Syllabus-source.pdf data/decrypted.pdf\n` +
        `  pdftotext -bbox-layout data/decrypted.pdf data/hsk_bbox.xml\n` +
        `  python3 scripts/_parse/parse_characters.py\n` +
        `  python3 scripts/_parse/parse_vocab.py`
    );
    process.exit(1);
  }

  const draft = regenerateDraft();
  const pending = draft.filter((d) => d.translationPending).length;
  console.log(
    `Regenerated ${DRAFT_PATH}: ${draft.length} entries ` +
      `(${draft.length - pending} translated, ${pending} translation-pending).`
  );

  if (!fs.existsSync(reviewedPath)) {
    console.log(
      `\nBelum ada data hasil review manusia (${reviewedPath} tidak ditemukan).\n` +
        `Sesuai aturan CLAUDE.md, tidak ada draft translation yang boleh masuk ke ` +
        `tabel Card tanpa direview manusia dulu.\n` +
        `\nLangkah selanjutnya: review ${DRAFT_PATH} secara manual, simpan hasilnya ` +
        `sebagai data/vocab-reviewed.json (array format sama, artiId/artiEn sudah ` +
        `diisi/dikoreksi manusia, needsReview dihapus/false), lalu jalankan ulang script ini.\n` +
        `\nno reviewed data yet, run the draft step first — tidak ada yang di-insert ke Card.`
    );
    return;
  }

  const reviewed: ReviewedVocab[] = JSON.parse(fs.readFileSync(reviewedPath, "utf-8"));
  console.log(`Ditemukan ${reviewed.length} entry hasil review di ${reviewedPath}. Meng-upsert ke Card...`);

  let created = 0;
  let updated = 0;
  for (const entry of reviewed) {
    const data = {
      hanzi: entry.hanzi,
      pinyin: entry.pinyin,
      artiId: entry.artiId,
      artiEn: entry.artiEn,
      hskLevel: entry.hskLevel,
      extraLevelNote: entry.extraLevelNote ?? null,
      partOfSpeech: entry.partOfSpeech,
      tipe: entry.tipe,
      exampleSentence: entry.exampleSentence ?? null,
    };
    const existing = await prisma.card.findUnique({
      where: { hanzi_hskLevel: { hanzi: entry.hanzi, hskLevel: entry.hskLevel } },
    });
    if (existing) {
      await prisma.card.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.card.create({ data });
      created++;
    }
  }

  const total = await prisma.card.count();
  const byLevel = await prisma.card.groupBy({ by: ["hskLevel"], _count: true, orderBy: { hskLevel: "asc" } });
  const byTipe = await prisma.card.groupBy({ by: ["tipe"], _count: true });
  const withExtra = await prisma.card.count({ where: { extraLevelNote: { not: null } } });
  const samples = await prisma.card.findMany({ take: 5 });

  console.log(`\n=== Card import summary ===`);
  console.log(`Created: ${created}, Updated: ${updated}`);
  console.log(`Total Card rows in DB: ${total}`);
  console.log(`With extraLevelNote: ${withExtra}`);
  console.log(`Breakdown per hskLevel:`);
  for (const row of byLevel) console.log(`  level ${row.hskLevel}: ${row._count}`);
  console.log(`Breakdown per tipe:`);
  for (const row of byTipe) console.log(`  ${row.tipe}: ${row._count}`);
  console.log(`Sample entries:`);
  for (const s of samples) console.log(`  ${s.hanzi} (${s.pinyin}) [L${s.hskLevel}] ${s.artiId} / ${s.artiEn}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

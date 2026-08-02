// scripts/import-vocab.ts
// Dipegang oleh: vocab-data-agent (.opencode/agent/vocab-data-agent.md)
// Import vocabulary (词汇大纲) dari dokumen resmi HSK 3.0 ke tabel Card.
//
// Sumber: docs/HSK-3.0-Syllabus-source.pdf (lihat docs/README.md untuk catatan teknis
// lengkap — dokumen terenkripsi, butuh `apt-get install poppler-data` sebelum bisa
// di-rasterize/extract text CJK dengan benar).
//
// Catatan: ini HANYA untuk komponen vocab (词汇大纲). 4 komponen lain (task/topic/
// character/grammar) masing-masing punya script sendiri — lihat
// scripts/import-topics.ts, scripts/import-characters.ts, scripts/import-tasks.ts,
// scripts/import-grammar.ts (belum dibuat, lihat vocab-data-agent.md untuk scope-nya).
//
// Jalankan: npx tsx scripts/import-vocab.ts
//
// TODO(vocab-data-agent):
// 1. Dekripsi & extract teks dari docs/HSK-3.0-Syllabus-source.pdf:
//      qpdf --decrypt docs/HSK-3.0-Syllabus-source.pdf /tmp/decrypted.pdf
//      pdftotext -layout /tmp/decrypted.pdf /tmp/hsk_text.txt
//    (pastikan poppler-data sudah terinstall, lihat docs/README.md)
// 2. Parse bagian 词汇大纲 (mulai sekitar halaman 76 dari daftar isi) — tabel dengan
//    kolom 序号/等级/词语/拼音/词性. Perhatikan notasi level tambahan seperti "3（4）"
//    dan superscript index seperti "本1", "点1" — lihat docs/README.md untuk detail.
// 3. Validasi tiap entry: hanzi tidak kosong, pinyin format standar, hskLevel 1-9.
// 4. `artiId` dan `artiEn` TIDAK ada di sumber — perlu dilengkapi dari sumber lain atau
//    AI-assist yang direview manusia. Jangan insert Card tanpa terjemahan yang sudah
//    direview untuk konten yang akan dipakai user.
// 5. Upsert ke tabel Card berdasarkan unique constraint (hanzi + hskLevel) — idempotent.
// 6. Print summary: total per level, berapa SHUXIE vs RENDU, berapa yang punya
//    extraLevelNote, contoh 3-5 entry.

import { PrismaClient, CardType } from "@prisma/client";

const prisma = new PrismaClient();

interface VocabEntry {
  hanzi: string;
  pinyin: string;
  artiId: string;
  artiEn: string;
  hskLevel: number;
  extraLevelNote?: string;
  partOfSpeech: string;
  tipe: CardType;
  exampleSentence?: string;
}

async function main() {
  console.log("TODO: implementasikan parsing docs/HSK-3.0-Syllabus-source.pdf terlebih dahulu.");
  console.log("Lihat .opencode/agent/vocab-data-agent.md dan docs/README.md untuk aturan lengkap.");

  // Contoh struktur upsert (aktifkan setelah parsing siap):
  //
  // const entries: VocabEntry[] = parseVocabSection("/tmp/hsk_text.txt");
  // for (const entry of entries) {
  //   await prisma.card.upsert({
  //     where: { hanzi_hskLevel: { hanzi: entry.hanzi, hskLevel: entry.hskLevel } },
  //     update: entry,
  //     create: entry,
  //   });
  // }
  // console.log(`Imported ${entries.length} vocab entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

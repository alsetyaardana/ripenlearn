# docs/ — Catatan Dokumen & Referensi

## HSK-3.0-Syllabus-source.pdf

Dokumen resmi **新版HSK考试大纲** (Syllabus for the Chinese Proficiency Test), diterbitkan
oleh **中外语言交流合作中心** (Center for Language Education and Cooperation / CLEC).
Diterbitkan 2025-11, efektif 2026-07. 406 halaman.

### Catatan Teknis Penting (untuk siapa pun yang mau proses ulang file ini)

- **File terenkripsi** (RC4, permission: print-only, copy dilarang, no-change,
  no-add-notes). Untuk pemrosesan lokal (rasterize/extract), dekripsi dulu:
  ```bash
  qpdf --decrypt HSK-3.0-Syllabus-source.pdf decrypted.pdf
  ```
  Hormati batasan lisensi dokumen asli — hasil dekripsi hanya untuk keperluan parsing
  data internal, bukan untuk didistribusikan ulang.

- **Render CJK gagal total** (halaman blank, error `Missing language pack for
  'Adobe-GB1' mapping`) kalau `poppler-data` belum terinstall di environment:
  ```bash
  apt-get install -y poppler-data
  ```
  Setelah ini, `pdftotext -layout` dan `pdftoppm` bekerja normal untuk konten CJK.

- Setelah dependency terpasang, `pdftotext -layout decrypted.pdf out.txt` menghasilkan
  ekstraksi teks yang bersih dan terstruktur (kolom tabel vocab masih agak berantakan
  karena watermark "国际汉考" yang tersisip di antara teks, tapi pola data tetap bisa
  di-parse dengan regex/heuristik).

### Struktur Dokumen (5 komponen terpisah)

Ditemukan dari daftar isi & isi dokumen — ini BUKAN cuma vocab list seperti draft awal
MVP mengasumsikan:

| # | Komponen | Halaman (approx, dari daftar isi) | Isi |
|---|---|---|---|
| 1 | 任务大纲 (Task Syllabus) | 1–54 | Kompetensi 听/说/读/写 per level, per kategori topik (misal "介绍个人情况", "交流、处理日常事务") |
| 2 | 话题大纲 (Topic Syllabus) | 55–75 | Hierarki 3 tingkat: 一级话题 → 二级话题 → 三级话题 (misal 日常生活 → 交通出行 → 出行方式) |
| 3 | 词汇大纲 (Vocabulary) | 76–351 | Tabel 序号/等级/词语/拼音/词性, urut abjad pinyin, level 1-9 kumulatif dalam satu urutan berkelanjutan |
| 4 | 汉字大纲 (Character Syllabus) | 352–388 | Daftar karakter TUNGGAL, terpisah 认读字 (recognition) vs 书写字 (must-write) per level |
| 5 | 语法大纲 (Grammar Syllabus) | 389–406+ | Tabel 类别/类别名称/语法内容 per level |

### Catatan Data Vocab (词汇大纲)

- Kolom "等级" kadang berisi notasi seperti `3（4）` — artinya: kata ini levelnya utama 3,
  tapi punya makna/POS tambahan yang baru relevan di level 4. Contoh dari sampling:
  `半 (bàn)` muncul sebagai `1（4）`. Ini **bukan typo** — field `extraLevelNote` di
  schema `Card` dipakai untuk menyimpan info ini.
- Beberapa kata punya angka superscript kecil untuk membedakan homonym/makna berbeda,
  misal `本1`, `点1` — perlu ditangani saat parsing supaya tidak keanggap duplikat entry.
- **Tidak ada kolom terjemahan Bahasa Indonesia maupun Inggris** di dokumen sumber — hanya
  Mandarin + pinyin + 词性 (part of speech). Terjemahan (`artiId`, `artiEn` di schema)
  harus dilengkapi dari sumber lain atau AI-assist yang direview manusia sebelum jadi
  konten produksi.
- Total entry vocab diperkirakan ribuan (dokumen 275 halaman tabel vocab) — proses
  ekstraksi otomatis diperlukan, manual entry tidak realistis. Lihat
  `.opencode/agent/vocab-data-agent.md` untuk pembagian kerja.

### Catatan Data Karakter (汉字大纲)

- Ini tabel **terpisah** dari vocab, unitnya karakter tunggal (汉字) bukan kata (词语).
  Satu karakter bisa jadi komponen banyak kata, tapi entry di sini independen per level.
- Split eksplisit 认读字 (cukup dikenali/dibaca) vs 书写字 (wajib bisa ditulis tangan) —
  konsisten dengan temuan awal riset kita soal HSK 3.0 yang memisahkan dua tingkat
  kemampuan karakter untuk pertama kalinya.

### Status Belum Selesai

Dokumen ini baru **di-review strukturnya**, belum full di-parse jadi data terstruktur
siap-seed. Task konversi lengkap (5 komponen → format yang bisa di-upsert ke Prisma)
adalah pekerjaan `vocab-data-agent` di Fase 1 — lihat `AGENTS.md` bagian "Sumber Data
Kurikulum" dan "Urutan Build".

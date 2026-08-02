# CLAUDE.md

Panduan kerja untuk opencode di project **Ripen** ini. Baca sebelum mulai task apapun.

## Ringkasan Project

**Ripen** — aplikasi web spaced-repetition Mandarin (mirip Anki) berbasis kurikulum resmi
HSK 3.0 (新版HSK考试大纲, CLEC, November 2025, efektif Juli 2026), dengan fitur AI (chat,
latihan baca, simulasi ujian) yang **hanya boleh memakai vocabulary yang sudah dikuasai
user** (status "mastered" di FSRS). Self-hosted penuh, multiuser, freemium.

Nama "Ripen" = metafora proses: vocab yang baru masuk "mentah" (new), lewat review
berulang jadi "matang" (mastered) — begitu matang baru boleh "dipetik" alias dipakai AI
untuk chat/exam/reading. Nama menggambarkan proses gating itu sendiri, yang jadi
diferensiasi utama produk ini dibanding "AI + flashcard" generik.

Detail lengkap ada di `docs/MVP-Draft-Mandarin-App.docx` (draft awal — beberapa bagian
sudah di-supersede oleh dokumen ini, terutama soal struktur data HSK 3.0 dan tier).

## Sumber Kurikulum — Struktur Resmi HSK 3.0

Dokumen resmi 新版HSK考试大纲 (`docs/HSK-3.0-Syllabus-source.pdf`, terenkripsi RC4 print-only,
lihat catatan di `docs/README.md` untuk cara baca ulang) terdiri dari **5 komponen
terpisah**, bukan cuma vocab list:

1. **任务大纲 (Task Syllabus)** — kompetensi 听/说/读/写 (listening/speaking/reading/writing)
   per level, per kategori topik (misal "介绍个人情况"). Model: `Task`.
2. **话题大纲 (Topic Syllabus)** — hierarki 3 level: 一级话题 → 二级话题 → 三级话题
   (misal "日常生活" → "交通出行" → "出行方式"). Model: `Topic`.
3. **词汇大纲 (Vocabulary)** — kata/词语 dengan kolom 序号/等级/词语/拼音/词性. Beberapa kata
   punya notasi level tambahan (misal "3（4）" = utamanya level 3, ada makna tambahan
   relevan di level 4) — field `extraLevelNote` di model `Card`. Model: `Card`.
4. **汉字大纲 (Character Syllabus)** — karakter TUNGGAL (汉字, bukan kata/词语), terpisah
   eksplisit jadi 认读字 (recognition-only) dan 书写字 (must-write) per level. Ini BEDA
   tabel dari vocab — jangan disatukan. Model: `Character`.
5. **语法大纲 (Grammar Syllabus)** — 类别/类别名称/语法内容 per level. Model: `GrammarPoint`.

Field `tipe` (SHUXIE/RENDU) di model `Card` (vocab) **tidak sama** dengan `tipe` di model
`Character` (karakter tunggal) — keduanya independen, jangan asumsikan satu-ke-satu.

## Tech Stack (jangan diganti tanpa didiskusikan)

| Layer | Pilihan |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Database | PostgreSQL (self-hosted container, bukan cloud DB pihak ketiga) |
| ORM | Prisma |
| Auth | NextAuth.js (Auth.js) + Google Provider, session di Postgres |
| Rate limit / quota | Redis |
| AI Provider | DeepSeek API — model `deepseek-v4-flash`, endpoint `https://api.deepseek.com`, OpenAI-compatible SDK |
| SRS Engine | `ts-fsrs` (FSRS algorithm) |
| Reverse proxy | Caddy (auto HTTPS) |
| Deploy | Docker Compose di VPS |
| Design reference | Google Stitch (lihat `stitch/`) |

Semua service jalan di container sendiri. Tidak ada dependency ke Vercel, Supabase, atau
platform cloud pihak ketiga untuk data/hosting inti. Google OAuth client ID/secret adalah
identity provider, bukan hosting dependency — itu OK.

## Setup & Menjalankan Project

```bash
cp .env.example .env      # lalu isi value asli (lihat komentar tiap variable)
docker compose up -d db redis     # nyalakan dependency dulu
npm install
npx prisma migrate dev            # apply schema ke db lokal
npx tsx scripts/import-vocab.ts   # seed vocab + karakter + topik + task + grammar HSK 3.0
npm run dev                       # jalankan Next.js dev server
```

Build check sebelum menganggap task selesai:
```bash
npm run build
npx prisma validate
```

## Data Model — Aturan Penting

- **`Card`, `Character`, `Topic`, `Task`, `GrammarPoint` bersifat global/shared** — satu
  sumber kurikulum HSK 3.0 resmi untuk semua user. JANGAN pernah hapus atau ganti primary
  key yang sudah dipakai; kalau perlu revisi, update field-nya saja. `CardProgress`,
  `DeckCard` mereferensikan `card_id`, jadi menghapus/mengganti ID akan merusak data user.
- **`CardProgress`** (progress FSRS untuk Card global) dan **`CustomCardProgress`**
  (progress FSRS untuk CustomCard) adalah dua model terpisah tapi pakai definisi/logic
  FSRS yang sama dari `lib/fsrs.ts` — jangan duplikasi logic, cukup duplikasi shape tabel.
- **Status "mastered"** ditentukan dari: `stability` FSRS di atas threshold (default 21
  hari) ATAU lolos N review berturut-turut tanpa lapse. Definisi ini dipakai di
  `lib/vocab-gate.ts` untuk membangun whitelist vocab yang dikirim ke AI — berlaku untuk
  Card global maupun CustomCard.
- **`Deck` adalah custom per user**, bisa berisi campuran dua sumber:
  1. `DeckCard` — subset yang di-pick dari `Card` global (filter by level/topik/dsb)
  2. `CustomCard` — kartu yang user buat sendiri, scoped ke satu Deck
  Review session dan vocab-gate untuk AI harus menggabungkan kedua sumber ini per deck.
  Lihat `lib/deck.ts` untuk kerangka fungsi yang perlu diimplementasikan.
- **`tipe` kartu vocab** (`书写` must-write vs `认读` recognize-only) relevan untuk
  constraint mode: latihan menulis/mengetik hanya boleh pakai `书写`, tapi listening/
  reading boleh pakai semua yang sudah direview termasuk `认读`. Ini terpisah dari
  `Character.tipe` (lihat bagian struktur HSK di atas).

## Tier & Quota

Tiga tier: `FREE`, `PREMIUM`, `UNLIMITED`.

- `FREE` dan `PREMIUM` punya limit harian (lihat `lib/quota.ts` untuk angka).
- **`UNLIMITED`** — tidak dibatasi quota sama sekali. Tier ini **tidak pernah** didapat
  lewat flow signup/upgrade otomatis — hanya di-set manual di database (`User.tier =
  UNLIMITED`) oleh pemilik aplikasi, misal untuk akun sendiri atau orang yang diajak
  belajar bareng. Usage tetap dicatat (untuk monitoring biaya DeepSeek), tapi
  `checkQuota()` tidak pernah throw untuk tier ini.
- Jangan bikin UI/flow yang mengekspos cara mendapat tier UNLIMITED ke user biasa — ini
  murni admin action manual di luar aplikasi (langsung query DB) untuk MVP.

## AI Integration — Aturan Wajib

1. Semua panggilan ke DeepSeek lewat `lib/ai.ts` — jangan panggil API langsung dari route
   handler lain.
2. **Cek quota dulu** (`lib/quota.ts`) sebelum memanggil DeepSeek di route manapun
   (`/api/chat`, `/api/exam`, `/api/reading`). Tidak ada AI call yang lolos tanpa quota
   check — termasuk untuk tier UNLIMITED (tetap tercatat, hanya tidak pernah ditolak).
3. **System prompt harus prefix-stable** untuk memanfaatkan context caching DeepSeek
   (cache-hit jauh lebih murah dari cache-miss). Taruh instruksi constraint + whitelist
   vocab di bagian awal system prompt dengan struktur/urutan konsisten — jangan
   random-order tiap request.
4. Vocab gating di prompt adalah **soft constraint**. Untuk fitur yang butuh jaminan lebih
   ketat (mis. simulasi ujian resmi), tambahkan post-processing check di
   `lib/vocab-gate.ts` menggunakan segmentasi Mandarin (jieba atau setara) sebelum output
   ditampilkan ke user.
5. Whitelist vocab untuk chat/exam/reading dibangun dari **deck yang sedang aktif** milik
   user (gabungan Card global + CustomCard di deck itu, yang sudah mastered) — bukan dari
   seluruh progress user secara global, kecuali user memang belum punya deck spesifik
   (fallback: semua Card mastered lintas deck).
6. API key DeepSeek selalu dari `process.env.DEEPSEEK_API_KEY`, tidak pernah hardcoded atau
   dikirim ke client.

## Konvensi Kode

- TypeScript strict mode, tidak ada `any` tanpa alasan jelas di komentar.
- Server-side logic (FSRS calc, AI calls, quota check, deck logic) selalu di `lib/`,
  dipanggil dari `app/api/*/route.ts` — jangan taruh business logic di komponen React.
- Migrasi Prisma selalu lewat `prisma migrate dev` (dev) / `prisma migrate deploy` (prod),
  jangan edit schema lalu push manual tanpa migration file.
- Semua endpoint AI harus punya try/catch dengan pesan error yang aman ditampilkan ke user
  (jangan bocorkan stack trace atau isi system prompt ke response error).
- Bahasa komentar/commit message: Indonesia atau Inggris keduanya oke, konsisten per file.

## Yang TIDAK boleh dilakukan tanpa konfirmasi eksplisit dari user

- Mengganti provider AI dari DeepSeek.
- Mengganti auth dari Google OAuth / NextAuth.
- Menambah dependency ke layanan cloud berbayar pihak ketiga (Vercel, Supabase, dst).
- Mengubah struktur ID card/character/topic/task/grammar yang sudah ada di data seed.
- Menaikkan/menurunkan limit quota freemium (`FREE_LIMITS` / `PREMIUM_LIMITS` di
  `lib/quota.ts`).
- Membuat flow otomatis yang memberi tier UNLIMITED ke user (harus tetap manual admin action).
- Deploy ke production / menjalankan migration di database production.

## Urutan Build (ikuti fase ini, jangan lompat)

1. **Fase 1** — Auth (Google OAuth) + schema Prisma lengkap (5 komponen HSK 3.0 + Deck/
   CustomCard) + seed data HSK 3.0 + review session FSRS dasar (Card global dulu) +
   dashboard. Quota layer disiapkan strukturnya meski belum dipakai fitur AI.
2. **Fase 1.5** — Custom deck: UI bikin deck, pilih subset Card global, tambah CustomCard
   sendiri, review session gabungan (global + custom dalam satu deck).
3. **Fase 2** — Fitur AI: chat constrained, latihan baca, simulasi ujian, scoped ke deck
   aktif. Quota enforcement aktif (termasuk logic UNLIMITED).
4. **Fase 3** — Publish: privacy policy, payment gateway, monitoring biaya, landing page.
5. **Fase 4** — Nice to have: TTS, heatmap progress, speech-to-text. Jangan dikerjakan
   sebelum Fase 1-3 selesai dan stabil.

## Sumber Data Kurikulum

Sumber utama: dokumen resmi 新版HSK考试大纲 (CLEC, November 2025) — lihat
`docs/HSK-3.0-Syllabus-source.pdf` dan catatan ekstraksi di `docs/README.md`. Dokumen ini
terenkripsi (RC4, print-only permission) dan butuh `poppler-data` package terinstall di
environment sebelum bisa di-rasterize/OCR dengan benar (tanpa itu, render CJK gagal total).
Teks bisa diekstrak bersih dengan `pdftotext -layout` setelah dependency itu terpasang.

Field wajib per entry vocab (`Card`): `hanzi`, `pinyin`, `artiId`, `artiEn`, `hskLevel`
(kumulatif), `partOfSpeech`, `tipe` (书写/认读), opsional `topicId`, `extraLevelNote`.
Field wajib per entry karakter (`Character`): `hanzi`, `hskLevel`, `tipe` (RENDU/SHUXIE).

`artiId` (arti Bahasa Indonesia) TIDAK ada di dokumen sumber (yang ada cuma Mandarin +
拼音 + 词性, tanpa terjemahan) — perlu dilengkapi terpisah (manual atau AI-assist yang
direview manusia), jangan auto-translate tanpa review untuk konten yang akan jadi
kurikulum inti aplikasi.

## Custom Deck — Model Singkat

- User bisa bikin banyak `Deck`.
- Satu Deck bisa isi subset `Card` global (lewat `DeckCard`) DAN/ATAU `CustomCard` buatan
  sendiri, dicampur bebas.
- Review session, dashboard "due today", dan vocab-gate untuk AI semua beroperasi dalam
  konteks satu Deck aktif (atau gabungan semua deck kalau user belum pilih spesifik —
  tentukan default behavior ini saat implementasi, dokumentasikan keputusannya).
- Lihat `lib/deck.ts` untuk kerangka fungsi (`createDeck`, `addGlobalCardsToDeck`,
  `addCustomCardToDeck`, `getDeckCards`) yang masih stub.

## Referensi Desain (Stitch)

Folder `stitch/` berisi prompt yang disiapkan untuk Google Stitch (tool desain UI
berbasis AI) — dipakai untuk generate referensi visual yang akan direview dan diarahkan
manual oleh pemilik project. **Jangan generate UI React berdasarkan asumsi desain sendiri
untuk halaman-halaman yang sudah punya prompt Stitch di folder ini** — tunggu hasil review
Stitch dari user dulu, atau tanyakan kalau perlu implementasi UI sebelum referensi itu ada.

## Subagents

Task spesifik didelegasikan ke subagent di `.opencode/agent/` — lihat
`.opencode/agent/README.md` untuk daftar lengkap dan pembagian tanggung jawab. Panggil
eksplisit dengan `@nama-agent` kalau perlu, atau biarkan opencode mendelegasikan otomatis
berdasarkan `description` tiap agent.

## Testing & Verifikasi

- Sebelum menganggap task selesai, jalankan `npm run build` untuk memastikan tidak ada
  error TypeScript/build.
- Untuk perubahan yang menyentuh FSRS calculation, tulis/jalankan test dengan skenario
  again/hard/good/easy dan pastikan `due_date` & `stability` berubah sesuai ekspektasi
  FSRS — untuk Card maupun CustomCard.
- Untuk perubahan quota logic, verifikasi reset harian bekerja (TTL Redis 86400 detik) dan
  verifikasi tier UNLIMITED tidak pernah throw QuotaExceededError.

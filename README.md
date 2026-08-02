# Ripen 🌱

Aplikasi web spaced-repetition Mandarin (mirip Anki) berbasis kurikulum resmi HSK 3.0,
dengan fitur AI (chat, latihan baca, simulasi ujian) yang hanya memakai vocabulary yang
sudah dikuasai user. Self-hosted penuh, multiuser, freemium.

**Nama "Ripen"** — vocab yang baru masuk "mentah" (belum matang), lewat proses spaced
repetition jadi "matang" (mastered), baru boleh dipakai buat ngobrol/baca/ujian. Nama ini
langsung menggambarkan mekanisme inti produk: progress belajar sebagai gate untuk fitur AI.

**Mulai kerja dari sini:** baca `AGENTS.md` — itu instruksi standing untuk opencode di
project ini. Detail struktur kurikulum HSK 3.0 (5 komponen resmi) ada di `docs/README.md`.

## Quick Start

```bash
cp .env.example .env
# isi .env: minimal DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET,
# DEEPSEEK_API_KEY sebelum lanjut

docker compose up -d db redis
npm install
npx prisma migrate dev --name init
npm run dev
```

Buka http://localhost:3000

## Struktur Project

```
.
├── AGENTS.md                  # instruksi kerja utama untuk opencode
├── .opencode/agent/           # subagent spesialis (lihat README di dalamnya)
├── docs/                      # dokumen MVP draft + sumber kurikulum HSK 3.0
├── stitch/                    # prompt referensi desain (Google Stitch)
├── app/                       # Next.js App Router
│   ├── api/                   # route handlers (auth, review, chat, exam, reading)
│   ├── dashboard/
│   ├── review/
│   └── chat/
├── lib/                       # business logic (auth, fsrs, ai, quota, vocab-gate, deck)
├── prisma/schema.prisma       # data model lengkap — 5 komponen HSK 3.0 + custom deck
├── scripts/import-vocab.ts    # seed kurikulum HSK 3.0
├── docker-compose.yml         # app + db + redis + caddy
├── Dockerfile
├── Caddyfile
└── data/                      # taruh file sumber vocab mentah di sini (gitignored)
```

## Fitur Kunci

- **Spaced repetition (FSRS)** — review kartu vocab dengan algoritma modern
- **Kurikulum resmi HSK 3.0** — 5 komponen: task syllabus (听/说/读/写), topic syllabus
  (hierarki 3 level), vocabulary, character syllabus (认读字/书写字), grammar syllabus
- **Custom deck** — user bisa bikin deck sendiri, campur subset vocab HSK resmi + kartu
  buatan sendiri
- **AI constrained ke mastered vocab** — chat, latihan baca, simulasi ujian yang HANYA
  memakai kata yang sudah dikuasai user (diferensiasi utama produk)
- **Freemium** — tier Free, Premium, dan Unlimited (khusus akses manual, tidak lewat
  signup biasa)

## Status

Skeleton awal — banyak fungsi di `lib/` masih stub (`throw new Error("Not implemented")`)
dengan TODO comment yang menunjuk ke subagent mana yang bertanggung jawab. Ikuti urutan
fase di `AGENTS.md`: Fase 1 (auth + schema + SRS dasar) → Fase 1.5 (custom deck) →
Fase 2 (fitur AI) → Fase 3 (publish) → Fase 4 (nice to have).

Dokumen sumber kurikulum HSK 3.0 sudah di-review strukturnya (lihat `docs/README.md`),
tapi belum di-parse penuh jadi data seed — itu task pertama `vocab-data-agent`.

## Stack

Next.js · TypeScript · PostgreSQL · Prisma · NextAuth.js (Google OAuth) · Redis ·
DeepSeek API (`deepseek-v4-flash`) · ts-fsrs · Docker Compose · Caddy

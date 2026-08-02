# Subagents — Ripen (opencode)

opencode otomatis mendeteksi file `.md` di `.opencode/agent/` sebagai subagent dan akan
mendelegasikan task ke agent yang relevan berdasarkan field `description`. Panggil eksplisit
dengan `@nama-file` (tanpa `.md`), misal `@srs-engine-agent benerin kalkulasi due_date ini`.

## Daftar Agent & Tanggung Jawab

| Agent | Fokus | Tidak boleh sentuh |
|---|---|---|
| `db-schema-agent` | Prisma schema, migration, integritas data (Card/Character/Topic/Task/GrammarPoint/Deck) | Business logic AI, UI |
| `srs-engine-agent` | Kalkulasi FSRS, status "mastered", custom deck (`lib/deck.ts`), endpoint /api/review | Schema (minta db-schema-agent), AI prompt |
| `ai-integration-agent` | DeepSeek client, prompt, vocab-gate, endpoint chat/exam/reading | Schema, FSRS calc, quota limit numbers |
| `quota-agent` | Redis rate-limit, freemium quota per fitur, tier UNLIMITED | AI logic, payment/subscription |
| `auth-agent` | NextAuth.js, Google OAuth, middleware proteksi | Schema tabel lain, business logic fitur |
| `infra-agent` | docker-compose, Dockerfile, Caddy, env vars | Application code |
| `vocab-data-agent` | Import/convert 5 komponen kurikulum HSK 3.0 resmi (task/topic/vocab/character/grammar) | Schema design, fitur AI |

## Kenapa dipecah begini

Tiap agent punya scope sempit supaya:
1. Context yang dibawa relevan aja (nggak perlu baca semua file project tiap task kecil).
2. Ada guardrail eksplisit per domain — misal `ai-integration-agent` nggak bisa diam-diam
   mengubah limit quota, harus lewat `quota-agent`.
3. Perubahan berisiko (schema migration, deploy production, ganti provider) selalu butuh
   konfirmasi eksplisit dari user, bukan keputusan sepihak satu agent.

## Alur kerja tipikal

Task besar biasanya menyentuh beberapa agent berurutan. Contoh: "tambahkan fitur simulasi
ujian" akan melibatkan `srs-engine-agent` (kartu mana yang due/mastered untuk dijadikan soal)
→ `ai-integration-agent` (generate soal + grading) → `quota-agent` (pastikan endpoint exam
kena quota check). opencode (agent utama/build mode) yang mengatur urutan ini berdasarkan
`AGENTS.md` di root project.

## Catatan format opencode

Setiap file agent di sini pakai frontmatter `mode: subagent` dan block `tools` /
`permissions` sesuai konfigurasi opencode (bukan format Claude Code `tools: Read, Write, ...`
yang lama). Kalau menambah agent baru, ikuti pola yang sama.

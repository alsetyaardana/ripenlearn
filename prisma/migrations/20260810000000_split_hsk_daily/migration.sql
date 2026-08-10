-- Migrasi: pisah HSK vs DailyTalk (20260810)
-- 1. Tabel baru DailyTalkCard + DailyTalkProgress + DeckHskCard + DeckChunkCard + DeckKind
BEGIN;

-- Enum DeckKind
DO $$ BEGIN
  CREATE TYPE "DeckKind" AS ENUM ('HSK', 'CHUNKING', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum CardStatus (sudah ada di migrasi lama — guard)
DO $$ BEGIN
  CREATE TYPE "CardStatus" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'MASTERED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DailyTalkCard
CREATE TABLE IF NOT EXISTS "DailyTalkCard" (
  id TEXT NOT NULL,
  hanzi TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  arti TEXT NOT NULL,
  category TEXT NOT NULL,
  "exampleSentence" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyTalkCard_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyTalkCard_hanzi_key" ON "DailyTalkCard"(hanzi);
CREATE INDEX IF NOT EXISTS "DailyTalkCard_category_idx" ON "DailyTalkCard"(category);

-- Salin 1,123 kartu hskLevel=8 dari Card ke DailyTalkCard (dedup by hanzi)
INSERT INTO "DailyTalkCard" (id, hanzi, pinyin, arti, category, "exampleSentence", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c.hanzi, c.pinyin, COALESCE(c."artiId", ''), COALESCE(c.category, 'daily'), c."exampleSentence", c."createdAt", c."updatedAt"
FROM "Card" c
WHERE c."hskLevel" = 8
ON CONFLICT (hanzi) DO NOTHING;

-- DailyTalkProgress
CREATE TABLE IF NOT EXISTS "DailyTalkProgress" (
  id TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dailyTalkCardId" TEXT NOT NULL,
  stability DOUBLE PRECISION NOT NULL DEFAULT 0,
  difficulty DOUBLE PRECISION NOT NULL DEFAULT 0,
  "dueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  status "CardStatus" NOT NULL DEFAULT 'NEW',
  "lastReviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyTalkProgress_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyTalkProgress_userId_dailyTalkCardId_key" ON "DailyTalkProgress"("userId", "dailyTalkCardId");
CREATE INDEX IF NOT EXISTS "DailyTalkProgress_userId_dueDate_idx" ON "DailyTalkProgress"("userId", "dueDate");

-- Hapus kartu hskLevel=8 dari Card (sudah disalin) — cek dulu tidak ada FK
DELETE FROM "Card" WHERE "hskLevel" = 8;

-- DeckHskCard (HSK 3.0 deck = cmskq6me00001in54q6tn06ul — kosong, aman)
CREATE TABLE IF NOT EXISTS "DeckHskCard" (
  id TEXT NOT NULL,
  "deckId" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  CONSTRAINT "DeckHskCard_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "DeckHskCard_deckId_cardId_key" ON "DeckHskCard"("deckId", "cardId");

-- DeckChunkCard (Daily Talk deck = cmsklpbd60001hk441tjda3pp)
CREATE TABLE IF NOT EXISTS "DeckChunkCard" (
  id TEXT NOT NULL,
  "deckId" TEXT NOT NULL,
  "dailyTalkCardId" TEXT NOT NULL,
  CONSTRAINT "DeckChunkCard_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "DeckChunkCard_deckId_dailyTalkCardId_key" ON "DeckChunkCard"("deckId", "dailyTalkCardId");

-- Isi DeckChunkCard dari DailyTalkCard (dedup by deckId+dailyTalkCardId)
INSERT INTO "DeckChunkCard" (id, "deckId", "dailyTalkCardId")
SELECT gen_random_uuid()::text, d.id, dtc.id
FROM "DailyTalkCard" dtc
CROSS JOIN "Deck" d
WHERE d.id IN ('cmsklpbd60001hk441tjda3pp')
ON CONFLICT ("deckId", "dailyTalkCardId") DO NOTHING;

-- Set kind deck
ALTER TABLE "Deck" ADD COLUMN IF NOT EXISTS "kind" "DeckKind" NOT NULL DEFAULT 'CUSTOM';
UPDATE "Deck" SET "kind" = 'CHUNKING' WHERE id = 'cmsklpbd60001hk441tjda3pp';
UPDATE "Deck" SET "kind" = 'HSK' WHERE id = 'cmskq6me00001in54q6tn06ul';

-- Drop DeckCard lama (join HSK-daily lama sudah tidak dipakai)
DROP TABLE IF EXISTS "DeckCard" CASCADE;

-- FK DailyTalkProgress → DailyTalkCard + User (kosong, tidak ada data)
ALTER TABLE "DailyTalkProgress" ADD CONSTRAINT "DailyTalkProgress_dailyTalkCardId_fkey"
  FOREIGN KEY ("dailyTalkCardId") REFERENCES "DailyTalkCard"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyTalkProgress" ADD CONSTRAINT "DailyTalkProgress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- FK DeckHskCard / DeckChunkCard → Deck (belum ada, tambah)
ALTER TABLE "DeckHskCard" ADD CONSTRAINT "DeckHskCard_deckId_fkey"
  FOREIGN KEY ("deckId") REFERENCES "Deck"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeckHskCard" ADD CONSTRAINT "DeckHskCard_cardId_fkey"
  FOREIGN KEY ("cardId") REFERENCES "Card"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeckChunkCard" ADD CONSTRAINT "DeckChunkCard_deckId_fkey"
  FOREIGN KEY ("deckId") REFERENCES "Deck"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeckChunkCard" ADD CONSTRAINT "DeckChunkCard_dailyTalkCardId_fkey"
  FOREIGN KEY ("dailyTalkCardId") REFERENCES "DailyTalkCard"(id) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

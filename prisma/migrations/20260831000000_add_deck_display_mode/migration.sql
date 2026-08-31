-- CreateEnum
CREATE TYPE "DeckDisplayMode" AS ENUM ('HANZI_FRONT', 'PINYIN_FRONT');

-- AlterTable
ALTER TABLE "Deck" ADD COLUMN "displayMode" "DeckDisplayMode" NOT NULL DEFAULT 'HANZI_FRONT';

-- Update Speaking Focus deck
UPDATE "Deck" SET "displayMode" = 'PINYIN_FRONT' WHERE name = 'Speaking Focus';

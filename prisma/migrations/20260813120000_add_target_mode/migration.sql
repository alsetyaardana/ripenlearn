-- Migration: tambah targetMode ke UserSettings (mode target belajar: seluruh deck / per kartu)
CREATE TYPE "TargetMode" AS ENUM ('DECK', 'CARD');

ALTER TABLE "UserSettings" ADD COLUMN "targetMode" "TargetMode" NOT NULL DEFAULT 'DECK';

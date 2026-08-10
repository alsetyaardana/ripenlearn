-- AlterTable
ALTER TABLE "CardProgress" ADD COLUMN     "consecutiveSuccess" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CustomCardProgress" ADD COLUMN     "consecutiveSuccess" INTEGER NOT NULL DEFAULT 0;

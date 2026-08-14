-- Migration: tabel StudyDay untuk streak harian (1 row per user per hari aktif)
CREATE TABLE "StudyDay" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "cardsStudied" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudyDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudyDay_userId_date_key" ON "StudyDay"("userId", "date");
CREATE INDEX "StudyDay_userId_date_idx" ON "StudyDay"("userId", "date");

ALTER TABLE "StudyDay" ADD CONSTRAINT "StudyDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

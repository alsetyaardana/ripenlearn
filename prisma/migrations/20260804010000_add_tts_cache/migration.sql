-- CreateTable
CREATE TABLE "TtsCache" (
    "id" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "audio" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "TtsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TtsCache_textHash_key" ON "TtsCache"("textHash");

-- CreateIndex
CREATE INDEX "TtsCache_lang_idx" ON "TtsCache"("lang");

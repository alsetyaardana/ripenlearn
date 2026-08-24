-- CreateTable
CREATE TABLE "ToneQuizResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "selectedTone" INTEGER NOT NULL,
    "correctTone" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToneQuizResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToneQuizResult_userId_idx" ON "ToneQuizResult"("userId");

-- CreateIndex
CREATE INDEX "ToneQuizResult_cardId_idx" ON "ToneQuizResult"("cardId");

-- AddForeignKey
ALTER TABLE "ToneQuizResult" ADD CONSTRAINT "ToneQuizResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToneQuizResult" ADD CONSTRAINT "ToneQuizResult_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

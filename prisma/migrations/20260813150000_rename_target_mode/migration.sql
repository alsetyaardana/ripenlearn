-- Rename nilai enum TargetMode: DECK->DATE (estimasi via tanggal target), CARD->RATE (estimasi via kartu per hari)
ALTER TYPE "TargetMode" RENAME VALUE 'DECK' TO 'DATE';
ALTER TYPE "TargetMode" RENAME VALUE 'CARD' TO 'RATE';

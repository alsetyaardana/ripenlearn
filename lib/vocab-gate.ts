// lib/vocab-gate.ts
// Dipegang oleh: ai-integration-agent (.opencode/agent/ai-integration-agent.md)
// Builder whitelist vocab + post-processing check (soft constraint di prompt,
// hard check di sini untuk mode yang butuh akurasi tinggi seperti exam).

import type { MasteredCard } from "./ai";

/**
 * Bangun whitelist vocab dari mastered cards, opsional filter by tipe
 * (书写/SHUXIE vs 认读/RENDU) tergantung mode latihan.
 * TODO(ai-integration-agent): implementasikan filter tipe untuk writing mode.
 */
export function buildVocabWhitelist(masteredWords: MasteredCard[]): Set<string> {
  return new Set(masteredWords.map((w) => w.hanzi));
}

/**
 * Post-processing check: segmentasi teks Mandarin lalu verifikasi tiap token
 * ada di whitelist. Soft constraint di prompt tidak selalu diikuti model,
 * jadi ini lapisan verifikasi tambahan untuk mode yang butuh presisi (exam).
 *
 * TODO(ai-integration-agent): integrasikan library segmentasi (jieba/nodejieba
 * atau setara). Untuk MVP awal boleh mulai dengan pendekatan sederhana dulu.
 */
export function verifyTextUsesWhitelist(
  text: string,
  whitelist: Set<string>
): { valid: boolean; outOfListTokens: string[] } {
  throw new Error("Not implemented — lihat .opencode/agent/ai-integration-agent.md");
}

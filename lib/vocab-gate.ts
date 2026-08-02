// lib/vocab-gate.ts
// Dipegang oleh: ai-integration-agent (.opencode/agent/ai-integration-agent.md)
// Builder whitelist vocab + post-processing check (soft constraint di prompt,
// hard check di sini untuk mode yang butuh akurasi tinggi seperti exam).

import { Segment, useDefault } from "segmentit";
import type { MasteredCard } from "./ai";

// Segmenter Mandarin dipilih: "segmentit" — pure JS (fork dari node-segment),
// tidak ada native/binary compilation step (aman di environment ini yang
// toolchain native-nya tidak reliable), dan cukup akurat untuk dictionary-based
// segmentation. Alternatif seperti nodejieba butuh node-gyp, jadi dihindari.
const segmenter = useDefault(new Segment());

// Karakter yang selalu diizinkan lepas dari whitelist: tanda baca (Mandarin &
// Latin) dan whitespace/angka — bukan "vocabulary" dalam pengertian HSK, jadi
// tidak masuk hitungan token out-of-list.
const PUNCTUATION_AND_WHITESPACE =
  /^[\s0-9a-zA-Z，。！？、；：""''（）《》【】…—～·,.!?;:"'()\[\]{}<>\-\/\\_@#$%^&*+=|~`]+$/;

/**
 * Bangun whitelist vocab dari mastered cards, opsional filter by tipe
 * (书写/SHUXIE vs 认读/RENDU) tergantung mode latihan.
 *
 * NOTE: `MasteredCard` (lib/ai.ts, hasil getMasteredCards() di lib/fsrs.ts) saat
 * ini hanya membawa {hanzi, pinyin, artiId} — field `tipe` (Card.tipe: SHUXIE/
 * RENDU) belum di-select di query getMasteredCards(). Filter tipe untuk writing
 * mode (hanya boleh 书写) butuh getMasteredCards() ikut mengembalikan `tipe`
 * dulu — itu perubahan di lib/fsrs.ts (di luar scope perubahan ini), jadi
 * parameter `tipeFilter` di sini disiapkan strukturnya tapi belum bisa
 * dieksekusi sampai field itu tersedia. TODO(ai-integration-agent / srs-engine-agent).
 */
export function buildVocabWhitelist(
  masteredWords: MasteredCard[],
  _tipeFilter?: "SHUXIE" | "RENDU"
): Set<string> {
  return new Set(masteredWords.map((w) => w.hanzi));
}

/**
 * Post-processing check: segmentasi teks Mandarin lalu verifikasi tiap token
 * ada di whitelist. Soft constraint di prompt tidak selalu diikuti model,
 * jadi ini lapisan verifikasi tambahan untuk mode yang butuh presisi (exam).
 *
 * Batasan yang perlu diketahui pemanggil: segmentasi dictionary-based seperti
 * ini bisa salah gabung/pisah token dibanding whitelist kita (mis. "我想" bisa
 * tersegmentasi jadi satu token walau whitelist hanya punya "我" dan "想"
 * terpisah) — jadi false positive (token ditandai out-of-list padahal
 * sebenarnya tersusun dari kata-kata yang dikuasai) mungkin terjadi. Untuk
 * mode exam ini oke sebagai sinyal "butuh review manusia/regenerate", bukan
 * ground truth mutlak.
 */
export function verifyTextUsesWhitelist(
  text: string,
  whitelist: Set<string>
): { valid: boolean; outOfListTokens: string[] } {
  const tokens = segmenter.doSegment(text, { simple: true }) as string[];

  const outOfListTokens: string[] = [];
  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    if (PUNCTUATION_AND_WHITESPACE.test(trimmed)) continue;
    if (whitelist.has(trimmed)) continue;
    outOfListTokens.push(trimmed);
  }

  return { valid: outOfListTokens.length === 0, outOfListTokens };
}

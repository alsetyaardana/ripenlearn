// lib/tts-text.ts
// Bangun teks untuk TTS Mandarin supaya bacaan natural (bukan baca huruf latin).
//
// Masalah: TTS baca hanzi dengan nada natural, tapi kata polifonik (多音字)
// bisa dibaca dengan bacaan default yang salah (还 → hái vs huán).
// Solusi: untuk kata polifonik, kirim "hanzi（pinyin）" — Edge TTS (Xiaoxiao)
// membaca hanzi dan memakai pinyin dalam kurung sebagai panduan bacaan.
// Untuk kata normal, cukup hanzi saja (baca natural, tanpa teks asing).
import { numToSymbolPinyin } from "./pinyin-format";

// Kata polifonik umum — bacaan tergantung konteks.
// Value tidak dipakai untuk pilihan bacaan (data pinyin DB sudah benar),
// hanya sebagai penanda bahwa kata ini perlu panduan pinyin.
const POLYPHONIC_HANZI = new Set([
  "还", "长", "只", "地", "得", "好", "为", "看", "着", "种", "头",
  "中", "行", "重", "发", "乐", "觉", "空", "数", "干", "当", "倒",
  "传", "划", "卡", "啊", "地方", "待", "扇", "挑", "冲", "便",
]);

/**
 * Teks yang dikirim ke TTS:
 * - Kata polifonik → "还（hái）" (hanzi + pinyin panduan)
 * - Kata biasa     → "还" (hanzi saja, natural)
 */
export function getTtsText(hanzi: string, pinyin?: string | null): string {
  const h = (hanzi || "").trim();
  if (!h) return "";
  if (pinyin && POLYPHONIC_HANZI.has(h)) {
    const symbol = numToSymbolPinyin(pinyin);
    return `${h}（${symbol}）`;
  }
  return h;
}

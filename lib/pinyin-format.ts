// lib/pinyin-format.ts
// Konversi pinyin berformat angka nada (huo4dong2) ke format simbol nada (huódòng).
// Dipakai di semua tempat render pinyin supaya tampilan konsisten.

const MARKS: Record<string, string[]> = {
  a: ["ā", "á", "ǎ", "à", "a"],
  e: ["ē", "é", "ě", "è", "e"],
  i: ["ī", "í", "ǐ", "ì", "i"],
  o: ["ō", "ó", "ǒ", "ò", "o"],
  u: ["ū", "ú", "ǔ", "ù", "u"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ", "ü"],
};

/**
 * Tentukan vokal yang diberi mark nada dalam satu suku kata (aturan pinyin):
 * - a atau e → vokal itu
 * - ou → o; iu → u; ui → i
 * - selain itu → vokal pertama
 * v: urutan vokal dalam suku kata (mis. "uo", "ao", "iu", "i").
 */
function markVowelIndex(v: string): number {
  if (v.includes("a")) return v.indexOf("a");
  if (v.includes("e")) return v.indexOf("e");
  if (v.includes("ou")) return v.indexOf("o");
  if (v.includes("uo")) return v.indexOf("o"); // "huo4" → huò
  if (v.includes("iu")) return v.indexOf("u");
  if (v.includes("ui")) return v.indexOf("i");
  return 0;
}

/** Konversi satu suku kata "huo4" → "huò". Tanpa digit tone → return apa adanya. */
function syllableToSymbol(syl: string): string {
  const m = /([1-5])$/.exec(syl);
  if (!m) return syl;
  const tone = Number(m[1]);
  const base = syl.slice(0, -1);
  const vowels = base.match(/[aeiouvü]+/gi)?.join("") ?? "";
  if (!vowels) return syl;
  const target = vowels[markVowelIndex(vowels)].toLowerCase();
  const marks = MARKS[target] ?? MARKS[target === "ü" ? "u" : target];
  const marked = marks ? marks[tone - 1] ?? target : target;
  // Ganti vokal target (case-insensitive, posisi asli) dengan versi bermark.
  const lower = base.toLowerCase();
  const idx = lower.indexOf(target);
  return base.slice(0, idx) + marked + base.slice(idx + target.length);
}

export function numToSymbolPinyin(py: string): string {
  if (!py) return py;
  // Cocokkan suku kata yang BERAKHIR digit nada (huo4, dong2) — digit termasuk token.
  return py.replace(/[a-zü]+[1-5]/gi, (syl) => syllableToSymbol(syl));
}

// lib/tones.ts
// Utilitas ekstraksi dan klasifikasi nada Mandarin dari pinyin.
// Dipakai di fitur Tone Recognition Quiz.

/** Mapping vokal bermark ke nomor nada (1-4). Vokal tanpa mark = nada netral (5). */
const TONE_MAP: Record<string, number> = {
  // Nada 1 (ā)
  ā: 1, ē: 1, ī: 1, ō: 1, ū: 1, ǖ: 1,
  // Nada 2 (á)
  á: 2, é: 2, í: 2, ó: 2, ú: 2, ǘ: 2,
  // Nada 3 (ǎ)
  ǎ: 3, ě: 3, ǐ: 3, ǒ: 3, ǔ: 3, ǚ: 3,
  // Nada 4 (à)
  à: 4, è: 4, ì: 4, ò: 4, ù: 4, ǜ: 4,
};

/**
 * Ekstrak nada dari string pinyin (bisa berisi simbol nada seperti "mā" atau
 * format angka seperti "ma1"). Return 1-4 untuk nada tonal, 5 untuk netral.
 *
 * Prioritas: simbol nada > angka akhir > netral.
 */
export function extractTone(pinyin: string): number {
  if (!pinyin) return 5;

  // Cek simbol nada dulu (ā á ǎ à dll)
  for (const ch of pinyin) {
    const tone = TONE_MAP[ch];
    if (tone !== undefined) return tone;
  }

  // Fallback: format angka di akhir suku kata (ma1, huo4)
  const numMatch = pinyin.match(/([1-4])\s*$/);
  if (numMatch) return parseInt(numMatch[1], 10);

  // Netral / light tone
  return 5;
}

/** Label nada untuk ditampilkan di UI. */
export function getToneLabel(tone: number): string {
  switch (tone) {
    case 1: return "Nada 1";
    case 2: return "Nada 2";
    case 3: return "Nada 3";
    case 4: return "Nada 4";
    default: return "Netral";
  }
}

/** Warna per nada — konsisten dengan konvensi warna nada Mandarin. */
export function getToneColor(tone: number): string {
  switch (tone) {
    case 1: return "#EF4444"; // merah — nada tinggi datar
    case 2: return "#F59E0B"; // kuning/oranye — nada naik
    case 3: return "#10B981"; // hijau — nada turun-naik
    case 4: return "#3B82F6"; // biru — nada turun tajam
    default: return "#6B7280"; // abu-abu — netral
  }
}

/** SVG path untuk garis kontur nada (viewBox 0 0 60 24). */
export function getToneContour(tone: number): string {
  switch (tone) {
    case 1: return "M 5 6 L 55 6";           // datar tinggi
    case 2: return "M 5 18 Q 30 12 55 4";    // naik
    case 3: return "M 5 6 Q 20 20 30 16 Q 40 12 55 4"; // turun-naik
    case 4: return "M 5 4 Q 30 10 55 20";    // turun tajam
    default: return "M 25 12 L 35 12";       // titik netral
  }
}

/** Deskripsi nada untuk tooltip/penjelasan. */
export function getToneDescription(tone: number): string {
  switch (tone) {
    case 1: return "tinggi datar";
    case 2: return "naik";
    case 3: return "turun lalu naik";
    case 4: return "turun tajam";
    default: return "ringan/netral";
  }
}

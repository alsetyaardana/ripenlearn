// lib/pinyin-annotate.ts
// Anotasi pinyin untuk teks Mandarin: segmentasi kata (segmentit) + lookup
// pinyin dengan nomor nada (pinyin-pro). Dipakai untuk render ruby di reading.

import { pinyin } from "pinyin-pro";
import { Segment, useDefault } from "segmentit";
import { numToSymbolPinyin } from "@/lib/pinyin-format";

export interface AnnotatedToken {
  /** Teks asli token — kata Mandarin, karakter tunggal, atau teks non-hanzi. */
  hanzi: string;
  /** Pinyin dengan nomor nada (mis. "nǐ" → "ni3"). Kosong untuk token non-hanzi. */
  pinyin: string;
  /** Nada 1-5 (5 = netral). 0 untuk token non-hanzi. */
  tone: number;
}

interface SegmentToken {
  w: string;
}

interface SegmentInstance {
  doSegment(text: string): SegmentToken[];
}

let segment: SegmentInstance | null = null;

/** Lazy singleton — instance Segment cukup dibuat sekali per proses. */
function getSegment(): SegmentInstance {
  if (!segment) {
    segment = useDefault(new Segment()) as unknown as SegmentInstance;
  }
  return segment;
}

/** True kalau token mengandung minimal satu karakter Han (U+4E00–U+9FFF). */
function containsHanzi(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Segmen teks Mandarin jadi token kata, masing-masing dengan pinyin + nomor nada.
 * Token non-hanzi (tanda baca, angka, huruf latin) dikembalikan apa adanya
 * dengan pinyin kosong dan tone 0 supaya UI bisa me-render ulang teks aslinya.
 */
export function annotatePassage(text: string): AnnotatedToken[] {
  const tokens = getSegment().doSegment(text);
  return tokens.map((token) => {
    const w = token.w;
    if (!containsHanzi(w)) {
      return { hanzi: w, pinyin: "", tone: 0 };
    }
    // pinyin() untuk kata multi-karakter otomatis pilih bacaan yang paling umum
    // per karakter (bukan lookup kamus kata), karena dictionary segmentit
    // lebih lengkap soal pemenggalan kata daripada dict pinyin-pro.
    const py = pinyin(w, { toneType: "num" });
    const last = py.match(/([0-9])$/)?.[1];
    const tone = last ? parseInt(last, 10) : 0;
    // Tampilkan pinyin dengan simbol nada (huó dòng), bukan angka (huo4dong2).
    return { hanzi: w, pinyin: numToSymbolPinyin(py), tone };
  });
}

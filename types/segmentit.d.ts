// types/segmentit.d.ts
// Minimal ambient typing untuk package "segmentit" (dipilih di lib/vocab-gate.ts
// sebagai Mandarin word segmenter — pure JS, tidak butuh native/binary build step,
// aman dipakai di environment ini). Package tidak menyertakan .d.ts sendiri, jadi
// kita declare subset API yang benar-benar dipakai saja.
declare module "segmentit" {
  export interface SegmentToken {
    w: string;
    p?: number;
  }

  export interface DoSegmentOptions {
    simple?: boolean;
    stripPunctuation?: boolean;
  }

  export class Segment {
    doSegment(text: string, options?: DoSegmentOptions): SegmentToken[] | string[];
    doSegment(text: string, options: { simple: true }): string[];
  }

  export function useDefault(segment: Segment): Segment;
}

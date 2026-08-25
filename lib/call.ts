// lib/call.ts
// Skenario AI voice call, system prompt builder, dan evaluasi percakapan.
// Semua AI call dilakukan lewat lib/ai.ts — file ini hanya menyediakan
// prompt dan parsing evaluasi.

import type { MasteredCard } from "./ai";

// ============================================================
// Skenario percakapan
// ============================================================

export interface CallScenario {
  id: string;
  name: string;
  icon: string; // Material Symbols icon name
  description: string;
  systemPrompt: string;
}

export const CALL_SCENARIOS: CallScenario[] = [
  {
    id: "restaurant",
    name: "Restoran",
    icon: "restaurant",
    description: "Pesan makanan di restoran Mandarin",
    systemPrompt: [
      "Kamu adalah pelayan restoran (服务员) yang ramah dan sabar.",
      "Bantu pelajar memesan makanan dan minuman.",
      "Tanya preferensi, rekomendasikan menu, konfirmasi pesanan.",
      "Gunakan HANYA vocabulary dari daftar yang diberikan.",
      "Jawab dalam 1-3 kalimat pendek per giliran.",
      "Setelah 6-8 giliran tukar, akhiri percakapan dengan sopan.",
    ].join(" "),
  },
  {
    id: "taxi",
    name: "Taksi",
    icon: "local_taxi",
    description: "Pesan taksi dan beri tahu tujuan",
    systemPrompt: [
      "Kamu adalah supir taksi (出租车司机) yang helpful.",
      "Bantu pelajar memberi tahu tujuan, tanya rute, dan ngobrol ringan.",
      "Tanya alamat, konfirmasi tujuan, obrol singkat tentang cuaca/kota.",
      "Gunakan HANYA vocabulary dari daftar yang diberikan.",
      "Jawab dalam 1-3 kalimat pendek per giliran.",
      "Setelah 6-8 giliran tukar, akhiri percakapan dengan sopan.",
    ].join(" "),
  },
  {
    id: "shopping",
    name: "Belanja",
    icon: "shopping_bag",
    description: "Tanya harga dan beli barang",
    systemPrompt: [
      "Kamu adalah penjaga toko (店员) yang sabar dan helpful.",
      "Bantu pelajar mencari barang, tanya harga, dan menawar.",
      "Tanya ukuran/warna, infokan harga, tawarkan diskon.",
      "Gunakan HANYA vocabulary dari daftar yang diberikan.",
      "Jawab dalam 1-3 kalimat pendek per giliran.",
      "Setelah 6-8 giliran tukar, akhiri percakapan dengan sopan.",
    ].join(" "),
  },
  {
    id: "hotel",
    name: "Hotel",
    icon: "hotel",
    description: "Check-in dan tanya fasilitas hotel",
    systemPrompt: [
      "Kamu adalah resepsionis hotel (前台) yang profesional dan ramah.",
      "Bantu pelajar check-in, tanya fasilitas, dan minta bantuan.",
      "Konfirmasi reservasi, jelaskan fasilitas, bantu permintaan kamar.",
      "Gunakan HANYA vocabulary dari daftar yang diberikan.",
      "Jawab dalam 1-3 kalimat pendek per giliran.",
      "Setelah 6-8 giliran tukar, akhiri percakapan dengan sopan.",
    ].join(" "),
  },
];

// ============================================================
// System prompt builder — vocab gating
// ============================================================

/**
 * Bangun system prompt untuk call mode. Struktur prefix-stable
 * untuk context caching DeepSeek (sama seperti chat/reading/exam).
 */
export function buildCallSystemPrompt(
  scenario: CallScenario,
  masteredWords: MasteredCard[]
): string {
  const vocabList = masteredWords.map((w) => `${w.hanzi}(${w.pinyin})`).join(", ");

  return [
    "Kamu adalah partner belajar Bahasa Mandarin untuk latihan percakapan lewat voice call.",
    "Gunakan HANYA kata-kata dari daftar vocabulary berikut yang sudah dikuasai pelajar:",
    vocabList || "(belum ada vocab mastered)",
    "Jika perlu kata di luar daftar ini, sertakan pinyin dan arti singkat dalam tanda kurung.",
    `Skenario: ${scenario.systemPrompt}`,
    "Format jawaban: JSON dengan field reply (Mandarin), pinyin, dan translation (Bahasa Indonesia).",
    'Contoh: {"reply": "你好！", "pinyin": "nǐ hǎo!", "translation": "Halo!"}',
    "Jawab HANYA dalam format JSON valid, tanpa markdown.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ============================================================
// Response parsing
// ============================================================

export interface CallReply {
  reply: string;
  pinyin: string;
  translation: string;
}

/** Parse JSON response dari DeepSeek untuk call chat. */
export function parseCallReply(raw: string): CallReply {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    // Fallback: raw text sebagai reply tanpa pinyin/translation
    return { reply: raw, pinyin: "", translation: "" };
  }

  if (typeof data !== "object" || data === null) {
    return { reply: raw, pinyin: "", translation: "" };
  }

  const d = data as { reply?: unknown; pinyin?: unknown; translation?: unknown };
  return {
    reply: typeof d.reply === "string" ? d.reply : raw,
    pinyin: typeof d.pinyin === "string" ? d.pinyin : "",
    translation: typeof d.translation === "string" ? d.translation : "",
  };
}

// ============================================================
// Evaluasi percakapan
// ============================================================

export interface CallEvaluation {
  score: number; // 0-100
  grammar: number; // 0-10
  vocab: number; // 0-10
  fluency: number; // 0-10
  feedback: string;
}

export interface CallMessage {
  role: "user" | "assistant";
  content: string;
}

const EVALUATE_TASK_INSTRUCTION = [
  "Evaluasi percakapan Mandarin pelajar berikut.",
  "Beri skor 0-100 untuk keseluruhan, dan sub-skor 0-10 untuk grammar, vocabulary, dan fluency.",
  "Berikan feedback konstruktif dalam Bahasa Indonesia (2-3 kalimat).",
  'Jawab HANYA dalam format JSON valid: {"score": number, "grammar": number, "vocab": number, "fluency": number, "feedback": string}',
].join(" ");

/**
 * Bangun prompt evaluasi — dipanggil di route handler, bukan di sini,
 * supaya route handler yang memanggil DeepSeek.
 */
export function buildEvaluatePrompt(
  scenario: CallScenario,
  messages: CallMessage[]
): string {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "Pelajar" : "AI"}: ${m.content}`)
    .join("\n");

  return [
    EVALUATE_TASK_INSTRUCTION,
    `Skenario: ${scenario.name}`,
    "Transkrip percakapan:",
    transcript,
  ].join("\n\n");
}

/** Parse JSON evaluasi dari DeepSeek. */
export function parseEvaluation(raw: string): CallEvaluation {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { score: 0, grammar: 0, vocab: 0, fluency: 0, feedback: "Gagal memproses evaluasi." };
  }

  if (typeof data !== "object" || data === null) {
    return { score: 0, grammar: 0, vocab: 0, fluency: 0, feedback: "Format evaluasi tidak valid." };
  }

  const d = data as {
    score?: unknown;
    grammar?: unknown;
    vocab?: unknown;
    fluency?: unknown;
    feedback?: unknown;
  };

  return {
    score: typeof d.score === "number" ? Math.min(100, Math.max(0, d.score)) : 0,
    grammar: typeof d.grammar === "number" ? Math.min(10, Math.max(0, d.grammar)) : 0,
    vocab: typeof d.vocab === "number" ? Math.min(10, Math.max(0, d.vocab)) : 0,
    fluency: typeof d.fluency === "number" ? Math.min(10, Math.max(0, d.fluency)) : 0,
    feedback: typeof d.feedback === "string" ? d.feedback : "",
  };
}

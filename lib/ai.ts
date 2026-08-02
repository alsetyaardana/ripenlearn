// lib/ai.ts
// Dipegang oleh: ai-integration-agent (.opencode/agent/ai-integration-agent.md)
// Semua panggilan DeepSeek WAJIB lewat file ini. Lihat AGENTS.md untuk aturan lengkap.

import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

export interface MasteredCard {
  hanzi: string;
  pinyin: string;
  artiId: string;
}

/**
 * Struktur system prompt harus prefix-stable untuk context caching DeepSeek.
 * Urutan: instruksi role tetap -> whitelist vocab -> instruksi constraint -> context topik.
 * JANGAN acak urutan ini per-request.
 */
function buildSystemPrompt(masteredWords: MasteredCard[], mode: "chat" | "reading" | "exam") {
  const vocabList = masteredWords.map((w) => `${w.hanzi}(${w.pinyin})`).join(", ");

  return [
    "Kamu adalah partner belajar Bahasa Mandarin yang membantu latihan percakapan.",
    "Gunakan HANYA kata-kata dari daftar vocabulary berikut yang sudah dikuasai pelajar:",
    vocabList || "(belum ada vocab mastered)",
    "Jika perlu kata di luar daftar ini, sertakan pinyin dan arti singkat dalam tanda kurung.",
    `Mode saat ini: ${mode}.`,
  ].join("\n\n");
}

/**
 * Chat mode — constrained ke mastered vocab user.
 * TODO(ai-integration-agent): tambah topic/kategori parameter, error handling timeout.
 */
export async function chatWithConstrainedVocab(
  masteredWords: MasteredCard[],
  userMessage: string
) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(masteredWords, "chat") },
      { role: "user", content: userMessage },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

/**
 * Generate latihan baca — paragraf pendek dari vocab mastered only.
 * TODO(ai-integration-agent): implementasikan.
 */
export async function generateReadingPassage(masteredWords: MasteredCard[]) {
  throw new Error("Not implemented — lihat .opencode/agent/ai-integration-agent.md");
}

/**
 * Generate soal simulasi ujian dari kartu due/mastered.
 * TODO(ai-integration-agent): implementasikan, termasuk auto-grade.
 */
export async function generateExamQuestions(masteredWords: MasteredCard[]) {
  throw new Error("Not implemented — lihat .opencode/agent/ai-integration-agent.md");
}

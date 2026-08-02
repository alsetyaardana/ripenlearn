// lib/ai.ts
// Dipegang oleh: ai-integration-agent (.opencode/agent/ai-integration-agent.md)
// Semua panggilan DeepSeek WAJIB lewat file ini. Lihat AGENTS.md untuk aturan lengkap.

import OpenAI from "openai";
import { buildVocabWhitelist, verifyTextUsesWhitelist } from "./vocab-gate";

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
 * JANGAN acak urutan ini per-request. Instruksi spesifik per-mode (task tail) ditaruh
 * lewat parameter `taskInstruction` di BAGIAN PALING AKHIR supaya bagian sebelumnya
 * (role + whitelist + constraint umum) tetap identik antar mode/request dan bisa
 * dapat cache-hit context caching DeepSeek.
 */
function buildSystemPrompt(
  masteredWords: MasteredCard[],
  mode: "chat" | "reading" | "exam",
  taskInstruction?: string
) {
  const vocabList = masteredWords.map((w) => `${w.hanzi}(${w.pinyin})`).join(", ");

  return [
    "Kamu adalah partner belajar Bahasa Mandarin yang membantu latihan percakapan.",
    "Gunakan HANYA kata-kata dari daftar vocabulary berikut yang sudah dikuasai pelajar:",
    vocabList || "(belum ada vocab mastered)",
    "Jika perlu kata di luar daftar ini, sertakan pinyin dan arti singkat dalam tanda kurung.",
    `Mode saat ini: ${mode}.`,
    taskInstruction ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");
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

export interface ReadingComprehensionQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface ReadingPassage {
  passage: string;
  translation: string;
  questions: ReadingComprehensionQuestion[];
  /** true kalau post-processing check (lib/vocab-gate.ts) menemukan token di luar whitelist
   * setelah retry — bukan blocking, tapi UI sebaiknya tampilkan disclaimer. */
  vocabWarning: boolean;
}

const READING_TASK_INSTRUCTION = [
  "Tugas: buatlah SATU paragraf latihan membaca (3-6 kalimat) dalam Bahasa Mandarin,",
  "topik sehari-hari yang natural, memakai HANYA vocabulary dari daftar di atas",
  "(partikel/kata fungsi dasar seperti 的/了/是/在/我/你 boleh dipakai walau tidak eksplisit",
  "di daftar, karena kata-kata itu level HSK1 paling dasar). Sertakan juga terjemahan",
  "Bahasa Indonesia dari paragraf itu, dan 1-2 pertanyaan pemahaman bacaan (comprehension",
  "check) pilihan ganda dengan 3-4 opsi dan tepat satu jawaban benar.",
  'Jawab HANYA dalam format JSON valid, tanpa markdown, dengan struktur persis:',
  '{"passage": string, "translation": string, "questions": [{"question": string, "options": string[], "correctIndex": number}]}',
].join(" ");

/**
 * Generate latihan baca — paragraf pendek dari vocab mastered only, plus
 * comprehension questions. Post-processing check (verifyTextUsesWhitelist) dipakai
 * sebagai hard-check tambahan: kalau paragraf hasil generate ternyata memuat token
 * di luar whitelist, retry SEKALI dengan feedback token yang melanggar. Kalau masih
 * gagal setelah retry, tetap dikembalikan ke caller tapi dengan flag `vocabWarning`
 * supaya UI bisa memberi disclaimer (bukan silently gagal — user tetap dapat materi).
 */
export async function generateReadingPassage(
  masteredWords: MasteredCard[]
): Promise<ReadingPassage> {
  const whitelist = buildVocabWhitelist(masteredWords);
  const systemPrompt = buildSystemPrompt(masteredWords, "reading", READING_TASK_INSTRUCTION);

  const requestOnce = async (extraUserNote?: string) => {
    const response = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: extraUserNote ?? "Buatkan latihan bacanya sekarang.",
        },
      ],
    });
    const raw = response.choices[0]?.message?.content ?? "{}";
    return parseReadingPassageJson(raw);
  };

  let parsed = await requestOnce();
  let check = verifyTextUsesWhitelist(parsed.passage, whitelist);

  if (!check.valid) {
    parsed = await requestOnce(
      `Percobaan sebelumnya memakai kata di luar daftar: ${check.outOfListTokens.join(
        ", "
      )}. Buat ulang paragraf TANPA kata-kata itu, tetap format JSON yang sama.`
    );
    check = verifyTextUsesWhitelist(parsed.passage, whitelist);
  }

  return { ...parsed, vocabWarning: !check.valid };
}

function parseReadingPassageJson(raw: string): Omit<ReadingPassage, "vocabWarning"> {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("DeepSeek returned malformed JSON for reading passage");
  }

  if (
    typeof data !== "object" ||
    data === null ||
    typeof (data as { passage?: unknown }).passage !== "string"
  ) {
    throw new Error("DeepSeek returned unexpected shape for reading passage");
  }

  const d = data as {
    passage: string;
    translation?: string;
    questions?: ReadingComprehensionQuestion[];
  };

  return {
    passage: d.passage,
    translation: d.translation ?? "",
    questions: Array.isArray(d.questions) ? d.questions : [],
  };
}

export interface ExamQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface ExamSet {
  questions: ExamQuestion[];
  vocabWarning: boolean;
}

const EXAM_QUESTION_COUNT = 10;

const EXAM_TASK_INSTRUCTION = [
  `Tugas: buatlah ${EXAM_QUESTION_COUNT} soal simulasi ujian HSK gaya pilihan ganda`,
  "(fill-in-the-blank atau pilih arti/kata yang tepat), memakai HANYA vocabulary dari",
  "daftar di atas (partikel/kata fungsi dasar level HSK1 seperti 的/了/是/在/我/你 boleh",
  "dipakai walau tidak eksplisit di daftar). Tiap soal punya 4 opsi jawaban dan tepat",
  "satu jawaban benar.",
  'Jawab HANYA dalam format JSON valid, tanpa markdown, dengan struktur persis:',
  '{"questions": [{"question": string, "options": string[4], "correctIndex": number}]}',
].join(" ");

/**
 * Generate soal simulasi ujian dari mastered vocab. Sama seperti reading, dilengkapi
 * post-processing check + satu kali retry sebelum dikembalikan dengan flag vocabWarning.
 *
 * NOTE: auto-grade & efek ke FSRS (update CardProgress berdasar jawaban benar/salah)
 * BELUM diimplementasikan di sini — itu scope srs-engine-agent (lihat komentar di
 * app/api/exam/route.ts). Fungsi ini hanya generate soal + correctIndex; grading
 * dilakukan client-side untuk MVP karena belum ada tabel sesi ujian di schema.
 */
export async function generateExamQuestions(masteredWords: MasteredCard[]): Promise<ExamSet> {
  const whitelist = buildVocabWhitelist(masteredWords);
  const systemPrompt = buildSystemPrompt(masteredWords, "exam", EXAM_TASK_INSTRUCTION);

  const requestOnce = async (extraUserNote?: string) => {
    const response = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: extraUserNote ?? "Buatkan soal ujiannya sekarang.",
        },
      ],
    });
    const raw = response.choices[0]?.message?.content ?? "{}";
    return parseExamQuestionsJson(raw);
  };

  let questions = await requestOnce();
  let combinedText = questions.map((q) => q.question + q.options.join("")).join("");
  let check = verifyTextUsesWhitelist(combinedText, whitelist);

  if (!check.valid) {
    questions = await requestOnce(
      `Percobaan sebelumnya memakai kata di luar daftar: ${check.outOfListTokens.join(
        ", "
      )}. Buat ulang semua soal TANPA kata-kata itu, tetap format JSON yang sama.`
    );
    combinedText = questions.map((q) => q.question + q.options.join("")).join("");
    check = verifyTextUsesWhitelist(combinedText, whitelist);
  }

  return { questions, vocabWarning: !check.valid };
}

function parseExamQuestionsJson(raw: string): ExamQuestion[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("DeepSeek returned malformed JSON for exam questions");
  }

  const questions = (data as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) {
    throw new Error("DeepSeek returned unexpected shape for exam questions");
  }

  return questions
    .filter(
      (q): q is ExamQuestion =>
        typeof q === "object" &&
        q !== null &&
        typeof (q as ExamQuestion).question === "string" &&
        Array.isArray((q as ExamQuestion).options)
    )
    .map((q) => ({
      question: q.question,
      options: q.options,
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
    }));
}

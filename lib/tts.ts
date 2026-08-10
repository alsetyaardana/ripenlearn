// lib/tts.ts
// Text-to-speech wrapper using Microsoft Edge's online TTS via the
// `edge-tts-ts` package (maintained fork of edge-tts). Free, no API key
// or credentials required.
//
// Audio results are cached in the TtsCache table (keyed by SHA-1 of
// `text:lang`). The cache is best-effort: any DB failure is swallowed so
// playback never blocks on the database.
import { createHash } from "node:crypto";
import { Communicate } from "edge-tts-ts";
import { prisma } from "@/lib/prisma";

const VOICE_MAP: Record<"id" | "en" | "zh", string> = {
  id: "id-ID-ArdiNeural",
  en: "en-US-AriaNeural",
  zh: "zh-CN-XiaoxiaoNeural",
};

function cacheKey(text: string, lang: string): string {
  return createHash("sha1").update(`${text}:${lang}`).digest("hex");
}

export async function synthesizeSpeech(text: string, lang: "id" | "en" | "zh"): Promise<Buffer> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Text is required");
  }

  const textHash = cacheKey(trimmed, lang);

  // Cache hit: return stored audio.
  try {
    const cached = await prisma.ttsCache.findUnique({ where: { textHash } });
    if (cached) {
      return cached.audio;
    }
  } catch {
    // DB down — proceed without cache.
  }

  const communicate = new Communicate(trimmed, { voice: VOICE_MAP[lang] });
  const chunks: Buffer[] = [];
  for await (const chunk of communicate.stream()) {
    if (chunk.type === "audio") {
      chunks.push(Buffer.from(chunk.data));
    }
  }
  const audio = Buffer.concat(chunks);

  // Cache miss: store best-effort; never block playback on DB failure.
  try {
    await prisma.ttsCache.create({
      data: { textHash, text: trimmed, lang, audio },
    });
  } catch {
    // Swallow — cache is an optimization, not a requirement.
  }

  return audio;
}

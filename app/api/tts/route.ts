// app/api/tts/route.ts
// POST handler: { text, lang } → audio/mpeg buffer. Auth-gated.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { synthesizeSpeech } from "@/lib/tts";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { text, lang } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }
    if (!lang || !["id", "en", "zh"].includes(lang)) {
      return NextResponse.json({ error: "Invalid language. Must be id, en, or zh" }, { status: 400 });
    }

    const audioBuffer = await synthesizeSpeech(text, lang);

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error("TTS error:", e);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}

// app/api/call/route.ts
// AI Voice Call — streaming chat + evaluasi percakapan.
// Quota check wajib sebelum setiap AI call.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkQuota, QuotaExceededError } from "@/lib/quota";
import { streamCallChat, evaluateCallConversation } from "@/lib/ai";
import { getMasteredCardsForDeck } from "@/lib/fsrs";
import { getUserSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import {
  CALL_SCENARIOS,
  buildCallSystemPrompt,
  buildEvaluatePrompt,
  parseCallReply,
  parseEvaluation,
  type CallMessage,
} from "@/lib/call";

/**
 * POST /api/call/chat — streaming response untuk percakapan call.
 * Body: { scenario: string, messages: CallMessage[], userMessage: string }
 * Response: SSE stream dengan { content } chunks, diakhiri [DONE].
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const tier = session.user.tier ?? "FREE";

  const body = await req.json().catch(() => null);
  const action = body?.action as string | undefined;

  // Route ke evaluate kalau action = "evaluate"
  if (action === "evaluate") {
    return handleEvaluate(userId, tier as "FREE" | "PREMIUM" | "UNLIMITED", body);
  }

  // Default: streaming chat
  return handleChat(userId, tier as "FREE" | "PREMIUM" | "UNLIMITED", body);
}

async function handleChat(
  userId: string,
  tier: "FREE" | "PREMIUM" | "UNLIMITED",
  body: Record<string, unknown> | null
) {
  // Validasi input
  const scenarioId = body?.scenario as string | undefined;
  const messages = body?.messages as CallMessage[] | undefined;
  const userMessage = body?.userMessage as string | undefined;

  if (!scenarioId || typeof scenarioId !== "string") {
    return NextResponse.json(
      { error: "Invalid body: expected { scenario: string }" },
      { status: 400 }
    );
  }

  if (!userMessage || typeof userMessage !== "string") {
    return NextResponse.json(
      { error: "Invalid body: expected { userMessage: string }" },
      { status: 400 }
    );
  }

  const scenario = CALL_SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) {
    return NextResponse.json({ error: "Skenario tidak ditemukan" }, { status: 400 });
  }

  // Quota check
  try {
    await checkQuota(userId, "call", tier);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: "Quota call harian habis", resetAt: err.resetAt },
        { status: 429 }
      );
    }
    throw err;
  }

  try {
    // Ambil mastered vocab dari deck aktif
    const settings = await getUserSettings(prisma, userId);
    const masteredWords = await getMasteredCardsForDeck(userId, settings.targetDeckId);
    const systemPrompt = buildCallSystemPrompt(scenario, masteredWords);

    // Bangun message history untuk konteks percakapan
    const history = Array.isArray(messages)
      ? messages.map((m: CallMessage) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      : [];

    // Tambahkan user message terbaru
    const allMessages = [...history, { role: "user" as const, content: userMessage }];

    // Streaming response
    const stream = await streamCallChat(systemPrompt, allMessages);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("call chat error:", err);
    return NextResponse.json(
      { error: "Gagal menghubungi AI, coba lagi sebentar lagi." },
      { status: 502 }
    );
  }
}

async function handleEvaluate(
  userId: string,
  tier: "FREE" | "PREMIUM" | "UNLIMITED",
  body: Record<string, unknown> | null
) {
  const scenarioId = body?.scenario as string | undefined;
  const messages = body?.messages as CallMessage[] | undefined;

  if (!scenarioId || typeof scenarioId !== "string") {
    return NextResponse.json(
      { error: "Invalid body: expected { scenario: string }" },
      { status: 400 }
    );
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Invalid body: expected { messages: CallMessage[] } non-empty" },
      { status: 400 }
    );
  }

  const scenario = CALL_SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) {
    return NextResponse.json({ error: "Skenario tidak ditemukan" }, { status: 400 });
  }

  // Quota check untuk evaluasi juga
  try {
    await checkQuota(userId, "call", tier);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: "Quota call harian habis", resetAt: err.resetAt },
        { status: 429 }
      );
    }
    throw err;
  }

  try {
    const evalPrompt = buildEvaluatePrompt(scenario, messages);
    const raw = await evaluateCallConversation(evalPrompt, evalPrompt);
    const evaluation = parseEvaluation(raw);
    return NextResponse.json(evaluation);
  } catch (err) {
    console.error("call evaluate error:", err);
    return NextResponse.json(
      { error: "Gagal mengevaluasi percakapan, coba lagi sebentar lagi." },
      { status: 502 }
    );
  }
}

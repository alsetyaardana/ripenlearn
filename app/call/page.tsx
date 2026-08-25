// app/call/page.tsx
// AI Voice Call — latihan percakapan Mandarin dengan AI.
// Tiga fase: select (pilih skenario) → calling (percakapan) → ended (evaluasi).
// Speech recognition pakai Web Speech API (zh-CN), fallback ke input teks.
// TTS auto-play untuk respon AI via useTts hook.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { useTts } from "@/lib/use-tts";

// ============================================================
// Tipe
// ============================================================

interface CallScenario {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface CallMessage {
  role: "user" | "assistant";
  content: string;
  pinyin?: string;
  translation?: string;
}

interface CallEvaluation {
  score: number;
  grammar: number;
  vocab: number;
  fluency: number;
  feedback: string;
}

type Phase = "select" | "calling" | "ended";

// Skenario — mirror dari lib/call.ts CALL_SCENARIOS (client tidak import server lib)
const SCENARIOS: CallScenario[] = [
  { id: "restaurant", name: "Restoran", icon: "restaurant", description: "Pesan makanan di restoran Mandarin" },
  { id: "taxi", name: "Taksi", icon: "local_taxi", description: "Pesan taksi dan beri tahu tujuan" },
  { id: "shopping", name: "Belanja", icon: "shopping_bag", description: "Tanya harga dan beli barang" },
  { id: "hotel", name: "Hotel", icon: "hotel", description: "Check-in dan tanya fasilitas hotel" },
];

// ============================================================
// Speech Recognition types (Web Speech API)
// ============================================================

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

// ============================================================
// Komponen utama
// ============================================================

export default function CallPage() {
  const { t } = useLanguage();
  const { speak, playing: ttsPlaying } = useTts();

  // State
  const [phase, setPhase] = useState<Phase>("select");
  const [scenario, setScenario] = useState<CallScenario | null>(null);
  const [messages, setMessages] = useState<CallMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [evaluation, setEvaluation] = useState<CallEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cek dukungan Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
        .webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  // ============================================================
  // Pilih skenario → mulai calling
  // ============================================================

  const selectScenario = useCallback((s: CallScenario) => {
    setScenario(s);
    setMessages([]);
    setEvaluation(null);
    setError(null);
    setPhase("calling");
    // Kirim greeting awal dari AI
    sendToAI(s.id, [], "Halo! Mari mulai percakapan.");
  }, []);

  // ============================================================
  // Kirim pesan ke AI (streaming)
  // ============================================================

  const sendToAI = useCallback(
    async (scenarioId: string, currentMessages: CallMessage[], userMessage: string) => {
      setSending(true);
      setError(null);

      // Tambahkan user message ke transcript
      const userMsg: CallMessage = { role: "user", content: userMessage };
      const updatedMessages = [...currentMessages, userMsg];
      setMessages(updatedMessages);

      try {
        const res = await fetch("/api/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario: scenarioId,
            messages: currentMessages,
            userMessage,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 429) {
            setError(t("call.quotaExceeded"));
          } else {
            setError(data.error || t("call.errorConnect"));
          }
          setSending(false);
          return;
        }

        // Streaming response
        const reader = res.body?.getReader();
        if (!reader) {
          setError(t("call.errorConnect"));
          setSending(false);
          return;
        }

        const decoder = new TextDecoder();
        let accumulated = "";

        // Tambah placeholder AI message
        const aiMsg: CallMessage = { role: "assistant", content: "" };
        setMessages([...updatedMessages, aiMsg]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") {
                    next[next.length - 1] = { ...last, content: accumulated };
                  }
                  return next;
                });
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }

        // Parse final response untuk extract pinyin/translation
        try {
          const parsed = JSON.parse(accumulated);
          if (parsed.reply) {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = {
                  ...last,
                  content: parsed.reply,
                  pinyin: parsed.pinyin,
                  translation: parsed.translation,
                };
              }
              return next;
            });
            // Auto-play TTS untuk respon AI
            speak(parsed.reply, "zh");
          }
        } catch {
          // Bukan JSON — pakai accumulated text langsung
          if (accumulated) {
            speak(accumulated, "zh");
          }
        }
      } catch {
        setError(t("call.errorConnect"));
      } finally {
        setSending(false);
      }
    },
    [speak, t]
  );

  // ============================================================
  // Speech Recognition
  // ============================================================

  const startListening = useCallback(() => {
    if (!speechSupported) return;

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "zh-CN";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      if (transcript) {
        setInput(transcript);
        // Auto-kirim setelah speech recognition
        if (scenario) {
          sendToAI(scenario.id, messages, transcript);
        }
      }
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [speechSupported, scenario, messages, sendToAI]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  // ============================================================
  // Kirim pesan teks
  // ============================================================

  const sendTextMessage = useCallback(() => {
    const text = input.trim();
    if (!text || !scenario || sending) return;

    setInput("");
    sendToAI(scenario.id, messages, text);
  }, [input, scenario, messages, sending, sendToAI]);

  // ============================================================
  // Evaluasi percakapan
  // ============================================================

  const evaluateConversation = useCallback(async () => {
    if (!scenario || messages.length < 2) return;

    setEvaluating(true);
    setError(null);

    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          scenario: scenario.id,
          messages,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(t("call.quotaExceeded"));
        } else {
          setError(data.error || t("call.errorConnect"));
        }
        setEvaluating(false);
        return;
      }

      const evalData: CallEvaluation = await res.json();
      setEvaluation(evalData);
      setPhase("ended");
    } catch {
      setError(t("call.errorConnect"));
    } finally {
      setEvaluating(false);
    }
  }, [scenario, messages, t]);

  // ============================================================
  // Reset untuk call baru
  // ============================================================

  const resetCall = useCallback(() => {
    setPhase("select");
    setScenario(null);
    setMessages([]);
    setEvaluation(null);
    setError(null);
    setInput("");
  }, []);

  // ============================================================
  // Render
  // ============================================================

  return (
    <main className="max-w-container-max mx-auto px-sm md:px-lg py-lg">
      {/* Fase 1: Pilih Skenario */}
      {phase === "select" && (
        <div className="space-y-lg">
          <div className="text-center">
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-sm">
              {t("call.title")}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {t("call.description")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md max-w-2xl mx-auto">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => selectScenario(s)}
                className="flex items-start gap-md p-md rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px] text-on-primary-container">
                    {s.icon}
                  </span>
                </div>
                <div>
                  <div className="font-title-md text-title-md text-on-surface">
                    {s.name}
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
                    {s.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fase 2: Percakapan berlangsung */}
      {phase === "calling" && scenario && (
        <div className="flex flex-col h-[calc(100vh-12rem)] max-w-2xl mx-auto">
          {/* Header skenario */}
          <div className="flex items-center gap-md mb-md">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-on-primary-container">
                {scenario.icon}
              </span>
            </div>
            <div>
              <div className="font-title-md text-title-md text-on-surface">
                {scenario.name}
              </div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">
                {scenario.description}
              </div>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-md p-sm rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">
              {error}
            </div>
          )}

          {/* Transcript */}
          <div
            ref={transcriptRef}
            className="flex-1 overflow-y-auto space-y-md mb-md p-md rounded-xl bg-surface-container-lowest"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-md py-sm ${
                    msg.role === "user"
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-tertiary-container text-on-tertiary-container"
                  }`}
                >
                  <div className="font-body-md text-body-md">{msg.content}</div>
                  {msg.pinyin && (
                    <div className="font-body-sm text-body-sm opacity-70 mt-xs">
                      {msg.pinyin}
                    </div>
                  )}
                  {msg.translation && (
                    <div className="font-body-sm text-body-sm opacity-50 mt-xs">
                      {msg.translation}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Indikator AI sedang mengetik */}
            {sending && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-tertiary-container text-on-tertiary-container rounded-2xl px-md py-sm">
                  <div className="flex gap-xs">
                    <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="text-center mb-sm">
            {ttsPlaying && (
              <span className="font-body-sm text-body-sm text-primary">
                {t("call.aiSpeaking")}
              </span>
            )}
            {listening && (
              <span className="font-body-sm text-body-sm text-primary">
                {t("call.listening")}
              </span>
            )}
          </div>

          {/* Input area */}
          <div className="flex items-center gap-sm">
            {/* Mic button */}
            {speechSupported && (
              <button
                onClick={listening ? stopListening : startListening}
                disabled={sending || ttsPlaying}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  listening
                    ? "bg-error text-on-error animate-pulse"
                    : "bg-primary-container text-on-primary-container hover:bg-primary-container/80"
                } disabled:opacity-50`}
                title={t("call.micHint")}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {listening ? "mic_off" : "mic"}
                </span>
              </button>
            )}

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendTextMessage();
                }
              }}
              placeholder={speechSupported ? t("call.typeHint") : t("call.micNotSupported")}
              disabled={sending || ttsPlaying}
              className="flex-1 px-md py-sm rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary disabled:opacity-50"
            />

            {/* Send button */}
            <button
              onClick={sendTextMessage}
              disabled={!input.trim() || sending || ttsPlaying}
              className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary/80 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[24px]">send</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-sm mt-md">
            <button
              onClick={() => {
                setPhase("select");
                setScenario(null);
              }}
              className="px-md py-xs rounded-full border border-outline-variant text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-low transition-colors"
            >
              {t("call.endCall")}
            </button>
            <button
              onClick={evaluateConversation}
              disabled={messages.length < 2 || evaluating}
              className="px-md py-xs rounded-full bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/80 transition-colors disabled:opacity-50"
            >
              {evaluating ? t("call.evaluating") : t("call.endCall")}
            </button>
          </div>
        </div>
      )}

      {/* Fase 3: Evaluasi */}
      {phase === "ended" && scenario && evaluation && (
        <div className="max-w-md mx-auto space-y-lg">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-md">
              <span className="material-symbols-outlined text-[40px] text-on-primary-container">
                {scenario.icon}
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
              {scenario.name}
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {t("call.score", { score: evaluation.score })}
            </p>
          </div>

          {/* Skor detail */}
          <div className="grid grid-cols-3 gap-md">
            <ScoreCard label={t("call.grammar")} score={evaluation.grammar} max={10} />
            <ScoreCard label={t("call.vocab")} score={evaluation.vocab} max={10} />
            <ScoreCard label={t("call.fluency")} score={evaluation.fluency} max={10} />
          </div>

          {/* Feedback */}
          <div className="p-md rounded-xl bg-surface-container-low border border-outline-variant">
            <div className="font-title-sm text-title-sm text-on-surface mb-sm">
              {t("call.feedback")}
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {evaluation.feedback}
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="p-sm rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-center gap-sm">
            <button
              onClick={resetCall}
              className="px-lg py-sm rounded-full bg-primary text-on-primary font-label-lg text-label-lg hover:bg-primary/80 transition-colors"
            >
              {t("call.callAgain")}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ============================================================
// Komponen kecil
// ============================================================

function ScoreCard({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="text-center p-md rounded-xl bg-surface-container-low border border-outline-variant">
      <div className="font-display-md text-display-md text-primary">{score}</div>
      <div className="font-body-sm text-body-sm text-on-surface-variant">/ {max}</div>
      <div className="font-label-sm text-label-sm text-on-surface mt-xs">{label}</div>
      {/* Progress bar */}
      <div className="mt-sm h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

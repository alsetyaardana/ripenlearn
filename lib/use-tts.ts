// lib/use-tts.ts
// Client-side hook: plays TTS audio from the authed /api/tts route.
// Fails silently on network/parse errors so the speaker button never
// blocks the flashcard flow.
"use client";

import { useCallback, useRef, useState } from "react";

const LANGUAGE_MAP: Record<string, "id" | "en" | "zh"> = {
  id: "id",
  en: "en",
  zh: "zh",
};

export function useTts() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  }, []);

  const speak = useCallback(
    async (text: string, lang: string) => {
      if (!text || !LANGUAGE_MAP[lang]) return;
      stop();
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang }),
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setPlaying(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setPlaying(false);
        };
        setPlaying(true);
        await audio.play().catch(() => {
          URL.revokeObjectURL(url);
          setPlaying(false);
        });
      } catch {
        // silent fail
      }
    },
    [stop]
  );

  return { speak, playing, stop };
}

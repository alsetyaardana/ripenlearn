// contexts/language-context.tsx
// React context for language switching. Persisted via localStorage.
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { type Language, t as translate, translations } from "@/lib/i18n";

const STORAGE_KEY = "ripen-lang";

interface LanguageContextValue {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("id");

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "id" || stored === "en") {
        setLanguage(stored);
      }
    } catch {
      // SSR or storage unavailable
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next: Language = prev === "id" ? "en" : "id";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(key, language, params),
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback for components rendered outside provider (shouldn't happen in practice)
    return {
      language: "id",
      toggleLanguage: () => {},
      t: (key: string, params?: Record<string, string | number>) => translate(key, "id", params),
    };
  }
  return ctx;
}

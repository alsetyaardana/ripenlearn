// app/tones/page.tsx
// Halaman Tones — Coming Soon. Placeholder untuk fitur latihan nada Mandarin.
"use client";

import { useLanguage } from "@/contexts/language-context";

export default function TonesPage() {
  const { t } = useLanguage();
  return (
    <main className="max-w-container-max mx-auto px-sm md:px-lg py-lg">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-lg text-center">
        <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-[40px] text-on-primary-container">
            record_voice_over
          </span>
        </div>

        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-sm">
            {t("tones.title")}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">
            {t("tones.description")}
          </p>
        </div>

        <div className="inline-flex items-center gap-xs px-md py-xs rounded-full border border-outline-variant bg-surface-container-low">
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            schedule
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {t("tones.comingSoon")}
          </span>
        </div>
      </div>
    </main>
  );
}

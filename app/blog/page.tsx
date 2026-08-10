// app/blog/page.tsx
// Halaman Blog — Coming Soon. Placeholder untuk artikel & tulisan seputar belajar Mandarin.
"use client";

import { useLanguage } from "@/contexts/language-context";

export default function BlogPage() {
  const { t } = useLanguage();
  return (
    <main className="max-w-container-max mx-auto px-sm md:px-lg py-lg">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-lg text-center">
        <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-[40px] text-on-primary-container">
            article
          </span>
        </div>

        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-sm">
            {t("blog.title")}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">
            {t("blog.description")}
          </p>
        </div>

        <div className="inline-flex items-center gap-xs px-md py-xs rounded-full border border-outline-variant bg-surface-container-low">
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            schedule
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {t("blog.comingSoon")}
          </span>
        </div>
      </div>
    </main>
  );
}

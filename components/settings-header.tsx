// components/settings-header.tsx
// Translated settings page title — client component.
"use client";

import { useLanguage } from "@/contexts/language-context";

export default function SettingsHeader() {
  const { t } = useLanguage();
  return (
    <h1 className="font-display-lg text-display-lg text-primary mb-lg">{t("settings.title")}</h1>
  );
}

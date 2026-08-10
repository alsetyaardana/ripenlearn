// components/admin-tabs.tsx
// Client component — tab navigation untuk admin dashboard (Kelola User / Global
// Deck / API Settings). State tab lokal via useState; konten per tab di-render
// dari prop panel (server component sudah menyiapkan data).
"use client";

import { useState, type ReactNode } from "react";
import { useLanguage } from "@/contexts/language-context";

export type AdminTabKey = "users" | "globalDeck" | "api";

const TABS: { key: AdminTabKey; labelKey: string; icon: string }[] = [
  { key: "users", labelKey: "admin.tabUsers", icon: "group" },
  { key: "globalDeck", labelKey: "admin.tabGlobalDeck", icon: "deck" },
  { key: "api", labelKey: "admin.tabApiSettings", icon: "settings" },
];

export default function AdminTabs({
  panels,
}: {
  panels: Record<AdminTabKey, ReactNode>;
}) {
  const { t } = useLanguage();
  const [active, setActive] = useState<AdminTabKey>("users");

  return (
    <div>
      <div className="flex gap-sm border-b border-unripe-pale mb-lg overflow-x-auto">
        {TABS.map((tab) => {
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`flex items-center gap-xs px-md py-sm font-label-caps text-label-caps border-b-2 transition-colors whitespace-nowrap ${
                selected
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {panels[active]}
    </div>
  );
}

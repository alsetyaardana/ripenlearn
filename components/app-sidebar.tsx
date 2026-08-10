// components/app-sidebar.tsx
// Sidebar navigasi — desktop: expanded (240px) default, collapse (64px) with toggle.
// Mobile: bottom bar 56px. Client component.
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-context";
import { useLanguage } from "@/contexts/language-context";

interface AppSidebarProps {
  name?: string | null;
  image?: string | null;
  tier?: string | null;
  role?: string | null;
}

function getNavItems(t: (key: string) => string, isAdmin: boolean) {
  const items = [
    { href: "/dashboard", icon: "dashboard", label: t("nav.dashboard") },
    { href: "/review", icon: "style", label: t("nav.review") },
    { href: "/deck", icon: "layers", label: t("nav.deck") },
    { href: "/chat", icon: "chat_bubble", label: t("nav.chat") },
    { href: "/reading", icon: "menu_book", label: t("nav.reading") },
    { href: "/tones", icon: "record_voice_over", label: t("nav.tones") },
    { href: "/call", icon: "call", label: t("nav.call") },
    { href: "/exam", icon: "quiz", label: t("nav.exam") },
    { href: "/settings", icon: "settings", label: t("nav.settings") },
  ];
  return items;
}

const TIER_KEYS: Record<string, string> = {
  FREE: "tier.free",
  PREMIUM: "tier.premium",
  UNLIMITED: "tier.unlimited",
};

const TIER_COLORS: Record<string, string> = {
  FREE: "bg-surface-container-high text-on-surface-variant",
  PREMIUM: "bg-secondary-fixed text-on-secondary-fixed",
  UNLIMITED: "bg-primary text-on-primary",
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppSidebar({ name, image, tier, role }: AppSidebarProps) {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const { t, language, toggleLanguage } = useLanguage();
  const isAdmin = role === "ADMIN";
  const allItems = getNavItems(t, isAdmin);

  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const tierLabel = t(TIER_KEYS[tier ?? "FREE"] ?? "tier.free");
  const tierColor = TIER_COLORS[tier ?? "FREE"] ?? TIER_COLORS.FREE;
  const sidebarWidth = collapsed ? "w-16" : "w-60";

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className={`hidden md:flex fixed inset-y-0 left-0 ${sidebarWidth} flex-col bg-surface-container-lowest border-r border-outline-variant/30 z-40 transition-all duration-200`}>
        {/* Header */}
        <div className={`flex items-center pt-4 pb-3 border-b border-outline-variant/20 ${collapsed ? "flex-col px-2 gap-2" : "flex-row px-3 gap-3"}`}>
          {image ? (
            <img src={image} alt={name ?? "User"} className="w-9 h-9 rounded-full object-cover border border-outline-variant/40 shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-headline-md text-sm shrink-0">{initials}</div>
          )}
          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-body-sm text-body-sm text-on-surface truncate">{name?.split(" ")[0] ?? "User"}</span>
              <span className={`font-label-caps text-[9px] px-1.5 py-0.5 rounded-full w-fit ${tierColor}`}>{tierLabel}</span>
            </div>
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="text-on-surface-variant hover:text-primary transition-colors shrink-0" title={t("nav.collapse")}>
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center pt-2 pb-1">
            <button onClick={() => setCollapsed(false)} className="text-on-surface-variant hover:text-primary transition-colors" title={t("nav.expand")}>
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className={`flex-1 flex flex-col gap-0.5 mt-2 ${collapsed ? "items-center px-1.5" : "px-2"}`}>
          {allItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} title={item.label}
                className={`flex items-center gap-3 py-2 rounded-lg transition-colors ${collapsed ? "justify-center" : "px-3"} ${active ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}>
                <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
                {!collapsed && <span className="font-body-sm text-body-sm whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Language toggle + Logout */}
        <div className={`pb-4 ${collapsed ? "px-1.5" : "px-2"} flex flex-col gap-0.5`}>
          <button onClick={toggleLanguage}
            className={`flex items-center gap-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors ${collapsed ? "justify-center" : "px-3"}`}
            title={language === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}>
            <span className="material-symbols-outlined text-[20px]">language</span>
            {!collapsed && <span className="font-body-sm text-body-sm">{language === "id" ? "English" : "Indonesia"}</span>}
          </button>
          <a href="/api/auth/signout"
            className={`flex items-center gap-2 py-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors ${collapsed ? "justify-center" : "px-3"}`}
            title={t("nav.logout")}>
            <span className="material-symbols-outlined text-[20px]">logout</span>
            {!collapsed && <span className="font-body-sm text-body-sm">{t("nav.logout")}</span>}
          </a>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      {/* Mobile: Dashboard, Review, Chat, More(Langit+Deck+Tones+Exam+Settings+Language+Logout) */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 bg-surface-container-lowest border-t border-outline-variant/30 z-40 flex flex-col">
        <div className="flex items-center justify-around h-14 px-1">
          {/* First 3 items always visible */}
          {allItems.slice(0, 3).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors min-w-0 ${active ? "text-primary" : "text-on-surface-variant"}`}>
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-label-caps text-[8px] leading-none uppercase truncate">{item.label}</span>
              </Link>
            );
          })}
          {/* More button — click to toggle, not hover */}
          <MobileMoreMenu allItems={allItems.slice(3)} pathname={pathname} t={t} language={language} toggleLanguage={toggleLanguage} />
        </div>
      </nav>
    </>
  );
}

// Separate client component for mobile More menu (click-to-toggle)
function MobileMoreMenu({ allItems, pathname, t, language, toggleLanguage }: {
  allItems: { href: string; icon: string; label: string }[];
  pathname: string;
  t: (key: string) => string;
  language: string;
  toggleLanguage: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex flex-col items-center gap-0.5 py-1 px-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-[20px]">{open ? "close" : "more_horiz"}</span>
        <span className="font-label-caps text-[8px] leading-none uppercase">{t("nav.more")}</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-56 bg-surface-container-lowest rounded-lg shadow-lg border border-outline-variant/30 py-1 z-50 flex flex-col max-h-[60vh] overflow-y-auto">
          {allItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm ${active ? "text-primary font-medium" : "text-on-surface-variant"} hover:bg-surface-container`}>
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
          <div className="border-t border-outline-variant/30 mt-1 pt-1">
            <button onClick={() => { toggleLanguage(); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container w-full text-left">
              <span className="material-symbols-outlined text-[18px]">language</span>
              {language === "id" ? "English" : "Indonesia"}
            </button>
            <a href="/api/auth/signout"
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-on-surface-variant hover:bg-error-container hover:text-error">
              <span className="material-symbols-outlined text-[18px]">logout</span>
              {t("nav.logout")}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

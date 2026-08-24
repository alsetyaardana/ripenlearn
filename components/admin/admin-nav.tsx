// components/admin/admin-nav.tsx
// Navigasi horizontal tab untuk admin section.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Dashboard", href: "/admin", icon: "dashboard" },
  { label: "Kelola User", href: "/admin/users", icon: "group" },
  { label: "AI Settings", href: "/admin/settings", icon: "tune" },
  { label: "Data Kurikulum", href: "/admin/curriculum", icon: "menu_book" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-xs mb-lg overflow-x-auto border-b border-unripe-pale">
      {TABS.map((tab) => {
        // Exact match untuk /admin, prefix match untuk sub-route
        const active =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-xs px-md py-sm rounded-t-lg font-label-caps text-label-caps whitespace-nowrap transition-colors ${
              active
                ? "bg-primary-container text-on-primary-container"
                : "hover:bg-surface-container-highest text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

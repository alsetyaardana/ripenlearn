// components/admin/admin-sidebar.tsx
// Client component — sidebar navigasi admin dengan link ke Users, Settings, Curriculum.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/admin/users", label: "Kelola User", icon: "group", exact: false },
  { href: "/admin/settings", label: "AI Settings", icon: "tune", exact: false },
  { href: "/admin/curriculum", label: "Data Kurikulum", icon: "menu_book", exact: false },
] as const;

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-surface-container-low border-r border-unripe-pale flex flex-col">
      <div className="p-md border-b border-unripe-pale">
        <Link
          href="/admin"
          className="flex items-center gap-sm font-headline-md text-headline-md text-primary"
        >
          <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
          Admin
        </Link>
      </div>
      <nav className="flex-1 p-sm flex flex-col gap-xs">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-sm px-md py-sm rounded-lg font-body-md text-body-md transition-colors ${
                active
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-sm border-t border-unripe-pale">
        <Link
          href="/dashboard"
          className="flex items-center gap-sm px-md py-sm rounded-lg font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Kembali ke App
        </Link>
      </div>
    </aside>
  );
}

// components/admin-user-table.tsx
// Client component — responsive table/card layout untuk admin user management.
"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/contexts/language-context";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  tier: "FREE" | "PREMIUM" | "UNLIMITED";
  role: "USER" | "ADMIN";
  createdAt: string;
};

export default function AdminUserTable({ users: initial }: { users: UserRow[] }) {
  const { t } = useLanguage();
  const [users, setUsers] = useState(initial);
  const [pending, startTransition] = useTransition();

  function updateField(id: string, field: "tier" | "role", value: string) {
    startTransition(async () => {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: value }),
      });
      if (!res.ok) return;
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, [field]: value } : u))
      );
    });
  }

  return (
    <div className="space-y-lg">
      <p className="font-body-md text-body-md text-on-surface-variant">
        {t("admin.userCount", { count: users.length })}
      </p>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-unripe-pale">
              <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">{t("admin.name")}</th>
              <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">{t("admin.email")}</th>
              <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">{t("admin.tier")}</th>
              <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">{t("admin.role")}</th>
              <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">{t("admin.registered")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-unripe-pale hover:bg-surface-container-low transition-colors">
                <td className="font-body-md text-body-md text-on-surface py-sm px-md">{u.name ?? "—"}</td>
                <td className="font-body-md text-body-md text-on-surface-variant py-sm px-md">{u.email ?? "—"}</td>
                <td className="py-sm px-md">
                  <select
                    value={u.tier}
                    disabled={pending}
                    onChange={(e) => updateField(u.id, "tier", e.target.value)}
                    className="bg-surface border border-unripe-pale rounded px-sm py-xs font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="FREE">FREE</option>
                    <option value="PREMIUM">PREMIUM</option>
                    <option value="UNLIMITED">UNLIMITED</option>
                  </select>
                </td>
                <td className="py-sm px-md">
                  <select
                    value={u.role}
                    disabled={pending}
                    onChange={(e) => updateField(u.id, "role", e.target.value)}
                    className="bg-surface border border-unripe-pale rounded px-sm py-xs font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="font-body-md text-body-md text-on-surface-variant py-sm px-md">
                  {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-md">
        {users.map((u) => (
          <div key={u.id} className="bg-surface-container-low rounded-xl p-md border border-unripe-pale space-y-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-headline-md text-headline-md text-on-surface">{u.name ?? "—"}</p>
                <p className="font-body-md text-body-md text-on-surface-variant">{u.email ?? "—"}</p>
              </div>
              <p className="font-label-caps text-label-caps text-on-surface-variant">
                {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="flex gap-md">
              <label className="flex-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant block mb-xs">{t("admin.tier")}</span>
                <select
                  value={u.tier}
                  disabled={pending}
                  onChange={(e) => updateField(u.id, "tier", e.target.value)}
                  className="w-full bg-surface border border-unripe-pale rounded px-sm py-xs font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="FREE">FREE</option>
                  <option value="PREMIUM">PREMIUM</option>
                  <option value="UNLIMITED">UNLIMITED</option>
                </select>
              </label>
              <label className="flex-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant block mb-xs">{t("admin.role")}</span>
                <select
                  value={u.role}
                  disabled={pending}
                  onChange={(e) => updateField(u.id, "role", e.target.value)}
                  className="w-full bg-surface border border-unripe-pale rounded px-sm py-xs font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

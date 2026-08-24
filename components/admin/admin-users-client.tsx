// components/admin/admin-users-client.tsx
// Client component — tabel user admin dengan search, edit tier/role, delete.
"use client";

import { useState, useTransition, useCallback } from "react";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  tier: "FREE" | "PREMIUM" | "UNLIMITED";
  role: "USER" | "ADMIN";
  createdAt: string;
};

export default function AdminUsersClient({ users: initial }: { users: UserRow[] }) {
  const [users, setUsers] = useState(initial);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = search
    ? users.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (u.email ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const updateField = useCallback(
    (id: string, field: "tier" | "role", value: string) => {
      startTransition(async () => {
        const res = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, [field]: value }),
        });
        if (!res.ok) return;
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
      });
    },
    []
  );

  const deleteUser = useCallback(
    (id: string) => {
      startTransition(async () => {
        const res = await fetch("/api/admin/users", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          alert(data?.error || "Gagal menghapus user");
          setDeleteConfirm(null);
          return;
        }
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setDeleteConfirm(null);
      });
    },
    []
  );

  return (
    <div className="space-y-lg">
      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          type="text"
          placeholder="Cari nama atau email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface border border-unripe-pale rounded-lg pl-10 pr-md py-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <p className="font-body-sm text-body-sm text-on-surface-variant">
        {filtered.length} user{search ? ` (dari ${users.length})` : ""}
      </p>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-unripe-pale">
              <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">Nama</th>
              <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">Email</th>
              <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">Tier</th>
              <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">Role</th>
              <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">Terdaftar</th>
              <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md w-20">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr
                key={u.id}
                className="border-b border-unripe-pale hover:bg-surface-container-low transition-colors"
              >
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
                  {new Date(u.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="py-sm px-md">
                  {deleteConfirm === u.id ? (
                    <div className="flex gap-xs">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => deleteUser(u.id)}
                        className="px-sm py-xs rounded text-xs font-semibold bg-error text-on-error hover:opacity-90 transition-opacity"
                      >
                        Hapus
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setDeleteConfirm(null)}
                        className="px-sm py-xs rounded text-xs font-semibold bg-surface-container-highest text-on-surface hover:opacity-90 transition-opacity"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setDeleteConfirm(u.id)}
                      className="material-symbols-outlined text-[18px] text-on-surface-variant hover:text-error transition-colors"
                      title="Hapus user"
                    >
                      delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-md">
        {filtered.map((u) => (
          <div
            key={u.id}
            className="bg-surface-container-low rounded-xl p-md border border-unripe-pale space-y-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-headline-md text-headline-md text-on-surface">{u.name ?? "—"}</p>
                <p className="font-body-md text-body-md text-on-surface-variant">{u.email ?? "—"}</p>
              </div>
              <p className="font-label-caps text-label-caps text-on-surface-variant">
                {new Date(u.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex gap-md">
              <label className="flex-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant block mb-xs">Tier</span>
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
                <span className="font-label-caps text-label-caps text-on-surface-variant block mb-xs">Role</span>
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
            {deleteConfirm === u.id ? (
              <div className="flex gap-sm pt-xs">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => deleteUser(u.id)}
                  className="flex-1 px-md py-sm rounded-lg font-label-md text-label-md bg-error text-on-error hover:opacity-90 transition-opacity"
                >
                  Konfirmasi Hapus
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setDeleteConfirm(null)}
                  className="px-md py-sm rounded-lg font-label-md text-label-md bg-surface-container-highest text-on-surface hover:opacity-90 transition-opacity"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => setDeleteConfirm(u.id)}
                className="flex items-center gap-xs text-error font-label-md text-label-md pt-xs"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Hapus User
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

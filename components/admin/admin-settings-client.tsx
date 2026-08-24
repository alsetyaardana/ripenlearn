// components/admin/admin-settings-client.tsx
// Client component — form edit global AI settings.
"use client";

import { useState, useTransition } from "react";

type Settings = {
  id: string;
  model: string;
  systemPromptPrefix: string;
  quotaFree: number;
  quotaPremium: number;
  updatedAt: Date | string;
};

export default function AdminSettingsClient({ settings: initial }: { settings: Settings }) {
  const [form, setForm] = useState({
    model: initial.model,
    systemPromptPrefix: initial.systemPromptPrefix,
    quotaFree: initial.quotaFree,
    quotaPremium: initial.quotaPremium,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error || "Gagal menyimpan");
          return;
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch {
        setError("Gagal terhubung ke server");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-lg max-w-2xl">
      {/* Model */}
      <section className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale space-y-md">
        <h2 className="font-headline-md text-headline-md text-on-surface">Model AI</h2>
        <label className="block">
          <span className="font-label-md text-label-md text-on-surface-variant block mb-xs">
            Nama Model DeepSeek
          </span>
          <input
            type="text"
            value={form.model}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            className="w-full bg-surface border border-unripe-pale rounded-lg px-md py-sm font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
      </section>

      {/* System Prompt */}
      <section className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale space-y-md">
        <h2 className="font-headline-md text-headline-md text-on-surface">System Prompt</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Prefix yang ditambahkan di awal system prompt setiap request AI. Untuk cache efficiency,
          prefix harus stabil (tidak berubah tiap request).
        </p>
        <label className="block">
          <span className="font-label-md text-label-md text-on-surface-variant block mb-xs">
            System Prompt Prefix
          </span>
          <textarea
            value={form.systemPromptPrefix}
            onChange={(e) => setForm((f) => ({ ...f, systemPromptPrefix: e.target.value }))}
            rows={6}
            className="w-full bg-surface border border-unripe-pale rounded-lg px-md py-sm font-body-md text-body-md text-on-surface font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </label>
      </section>

      {/* Quota */}
      <section className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale space-y-md">
        <h2 className="font-headline-md text-headline-md text-on-surface">Quota Harian</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Limit harian per fitur AI (chat + exam + reading digabung). UNLIMITED tidak dibatasi.
        </p>
        <div className="grid grid-cols-2 gap-md">
          <label className="block">
            <span className="font-label-md text-label-md text-on-surface-variant block mb-xs">
              FREE
            </span>
            <input
              type="number"
              min={0}
              value={form.quotaFree}
              onChange={(e) => setForm((f) => ({ ...f, quotaFree: parseInt(e.target.value, 10) || 0 }))}
              className="w-full bg-surface border border-unripe-pale rounded-lg px-md py-sm font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="block">
            <span className="font-label-md text-label-md text-on-surface-variant block mb-xs">
              PREMIUM
            </span>
            <input
              type="number"
              min={0}
              value={form.quotaPremium}
              onChange={(e) => setForm((f) => ({ ...f, quotaPremium: parseInt(e.target.value, 10) || 0 }))}
              className="w-full bg-surface border border-unripe-pale rounded-lg px-md py-sm font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-md">
        <button
          type="submit"
          disabled={pending}
          className="px-xl py-sm rounded-lg font-label-md text-label-md bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending ? "Menyimpan..." : "Simpan"}
        </button>
        {saved && (
          <span className="font-body-md text-body-md text-good-green flex items-center gap-xs">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Tersimpan
          </span>
        )}
        {error && (
          <span className="font-body-md text-body-md text-error flex items-center gap-xs">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

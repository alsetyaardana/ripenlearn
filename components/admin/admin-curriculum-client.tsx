// components/admin/admin-curriculum-client.tsx
// Client component — sub-tab kurikulum (Cards, Characters, Topics, Grammar)
// dengan search, filter level, pagination, dan edit modal.
"use client";

import { useState, useEffect, useTransition, useCallback } from "react";

type SubTab = "cards" | "characters" | "topics" | "grammar";

const SUB_TABS: { key: SubTab; label: string; icon: string }[] = [
  { key: "cards", label: "Cards (Vocab)", icon: "style" },
  { key: "characters", label: "Characters", icon: "translate" },
  { key: "topics", label: "Topics", icon: "topic" },
  { key: "grammar", label: "Grammar", icon: "spellcheck" },
];

const HSK_LEVELS = [1, 2, 3, 4, 5, 6, 7];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = Record<string, any>;

export default function AdminCurriculumClient() {
  const [tab, setTab] = useState<SubTab>("cards");
  const [level, setLevel] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [pending, startTransition] = useTransition();

  const pageSize = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: tab, page: String(page), pageSize: String(pageSize) });
      if (level) params.set("level", String(level));
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/curriculum?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [tab, level, search, page]);

  useEffect(() => {
    setPage(1);
    setSearch("");
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  function handleSave(type: string, id: string, fields: Record<string, unknown>) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/curriculum", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, id, ...fields }),
        });
        if (!res.ok) return;
        setEditItem(null);
        fetchData();
      } catch {
        // silent
      }
    });
  }

  return (
    <div className="space-y-lg">
      {/* Sub-tabs */}
      <div className="flex gap-sm border-b border-unripe-pale overflow-x-auto">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-xs px-md py-sm font-label-caps text-label-caps border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-md">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder={`Cari ${tab === "cards" ? "hanzi, pinyin, arti..." : tab === "characters" ? "hanzi..." : tab === "topics" ? "nama topik..." : "kategori, konten..."}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-unripe-pale rounded-lg pl-10 pr-md py-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value ? parseInt(e.target.value, 10) : "")}
          className="bg-surface border border-unripe-pale rounded-lg px-md py-sm font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Semua Level</option>
          {HSK_LEVELS.map((l) => (
            <option key={l} value={l}>HSK {l}</option>
          ))}
        </select>
      </div>

      {/* Info */}
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        {loading ? "Memuat..." : `${total} data`}
        {totalPages > 1 && ` · Halaman ${page}/${totalPages}`}
      </p>

      {/* Table */}
      <div className="overflow-x-auto">
        {tab === "cards" && (
          <CardsTable items={items} onEdit={setEditItem} />
        )}
        {tab === "characters" && (
          <CharactersTable items={items} onEdit={setEditItem} />
        )}
        {tab === "topics" && (
          <TopicsTable items={items} onEdit={setEditItem} />
        )}
        {tab === "grammar" && (
          <GrammarTable items={items} onEdit={setEditItem} />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-md py-sm rounded-lg font-label-md text-label-md bg-surface-container-highest text-on-surface hover:opacity-90 disabled:opacity-30 transition-opacity"
          >
            ← Prev
          </button>
          <span className="px-md py-sm font-body-md text-body-md text-on-surface-variant">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-md py-sm rounded-lg font-label-md text-label-md bg-surface-container-highest text-on-surface hover:opacity-90 disabled:opacity-30 transition-opacity"
          >
            Next →
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <EditModal
          type={tab}
          item={editItem}
          onSave={handleSave}
          onClose={() => setEditItem(null)}
          pending={pending}
        />
      )}
    </div>
  );
}

// --- Sub-tables ---

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`font-body-md text-body-md text-on-surface py-sm px-md ${className ?? ""}`}>
      {children}
    </td>
  );
}

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="material-symbols-outlined text-[18px] text-on-surface-variant hover:text-primary transition-colors"
      title="Edit"
    >
      edit
    </button>
  );
}

function CardsTable({ items, onEdit }: { items: Item[]; onEdit: (i: Item) => void }) {
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-unripe-pale">
          <Th>Hanzi</Th>
          <Th>Pinyin</Th>
          <Th>Arti ID</Th>
          <Th>Arti EN</Th>
          <Th>HSK</Th>
          <Th>Tipe</Th>
          <Th>POS</Th>
          <Th>Aksi</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((c) => (
          <tr key={c.id} className="border-b border-unripe-pale hover:bg-surface-container-low transition-colors">
            <Td className="font-semibold">{c.hanzi}</Td>
            <Td>{c.pinyin}</Td>
            <Td className="max-w-[200px] truncate">{c.artiId}</Td>
            <Td className="max-w-[200px] truncate">{c.artiEn}</Td>
            <Td>{c.hskLevel}</Td>
            <Td>
              <span className={`px-xs py-0.5 rounded text-xs font-semibold ${c.tipe === "SHUXIE" ? "bg-primary-container text-on-primary-container" : "bg-tertiary-container text-on-tertiary-container"}`}>
                {c.tipe === "SHUXIE" ? "书写" : "认读"}
              </span>
            </Td>
            <Td className="text-xs">{c.partOfSpeech}</Td>
            <Td><EditBtn onClick={() => onEdit(c)} /></Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CharactersTable({ items, onEdit }: { items: Item[]; onEdit: (i: Item) => void }) {
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-unripe-pale">
          <Th>Hanzi</Th>
          <Th>HSK</Th>
          <Th>Tipe</Th>
          <Th>Aksi</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((c) => (
          <tr key={c.id} className="border-b border-unripe-pale hover:bg-surface-container-low transition-colors">
            <Td className="font-semibold text-lg">{c.hanzi}</Td>
            <Td>{c.hskLevel}</Td>
            <Td>
              <span className={`px-xs py-0.5 rounded text-xs font-semibold ${c.tipe === "SHUXIE" ? "bg-primary-container text-on-primary-container" : "bg-tertiary-container text-on-tertiary-container"}`}>
                {c.tipe === "SHUXIE" ? "书写" : "认读"}
              </span>
            </Td>
            <Td><EditBtn onClick={() => onEdit(c)} /></Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TopicsTable({ items, onEdit }: { items: Item[]; onEdit: (i: Item) => void }) {
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-unripe-pale">
          <Th>一级话题</Th>
          <Th>二级话题</Th>
          <Th>三级话题</Th>
          <Th>HSK</Th>
          <Th>Aksi</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((t) => (
          <tr key={t.id} className="border-b border-unripe-pale hover:bg-surface-container-low transition-colors">
            <Td>{t.levelOneName}</Td>
            <Td>{t.levelTwoName}</Td>
            <Td>{t.levelThreeName}</Td>
            <Td>{t.hskLevel}</Td>
            <Td><EditBtn onClick={() => onEdit(t)} /></Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GrammarTable({ items, onEdit }: { items: Item[]; onEdit: (i: Item) => void }) {
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-unripe-pale">
          <Th>HSK</Th>
          <Th>类别</Th>
          <Th>类别名称</Th>
          <Th>语法内容</Th>
          <Th>Aksi</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((g) => (
          <tr key={g.id} className="border-b border-unripe-pale hover:bg-surface-container-low transition-colors">
            <Td>{g.hskLevel}</Td>
            <Td>{g.category}</Td>
            <Td>{g.subCategory}</Td>
            <Td className="max-w-[300px] truncate">{g.content}</Td>
            <Td><EditBtn onClick={() => onEdit(g)} /></Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// --- Edit Modal ---

function EditModal({
  type,
  item,
  onSave,
  onClose,
  pending,
}: {
  type: SubTab;
  item: Item;
  onSave: (type: string, id: string, fields: Record<string, unknown>) => void;
  onClose: () => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    if (type === "cards") {
      base.pinyin = item.pinyin; base.artiId = item.artiId; base.artiEn = item.artiEn;
      base.tipe = item.tipe; base.partOfSpeech = item.partOfSpeech; base.exampleSentence = item.exampleSentence ?? "";
    } else if (type === "characters") {
      base.tipe = item.tipe;
    } else if (type === "topics") {
      base.levelOneName = item.levelOneName; base.levelTwoName = item.levelTwoName; base.levelThreeName = item.levelThreeName;
    } else if (type === "grammar") {
      base.category = item.category; base.subCategory = item.subCategory; base.content = item.content;
    }
    return base;
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(type, item.id, form);
  }

  const fields = type === "cards"
    ? [
        { key: "pinyin", label: "Pinyin", type: "text" },
        { key: "artiId", label: "Arti Indonesia", type: "text" },
        { key: "artiEn", label: "Arti English", type: "text" },
        { key: "tipe", label: "Tipe", type: "select", options: ["SHUXIE", "RENDU"] },
        { key: "partOfSpeech", label: "词性 (POS)", type: "text" },
        { key: "exampleSentence", label: "Contoh Kalimat", type: "textarea" },
      ]
    : type === "characters"
    ? [
        { key: "tipe", label: "Tipe", type: "select", options: ["SHUXIE", "RENDU"] },
      ]
    : type === "topics"
    ? [
        { key: "levelOneName", label: "一级话题", type: "text" },
        { key: "levelTwoName", label: "二级话题", type: "text" },
        { key: "levelThreeName", label: "三级话题", type: "text" },
      ]
    : [
        { key: "category", label: "类别", type: "text" },
        { key: "subCategory", label: "类别名称", type: "text" },
        { key: "content", label: "语法内容", type: "textarea" },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-surface rounded-xl p-lg border border-unripe-pale w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-md">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Edit {type === "cards" ? item.hanzi : type === "characters" ? item.hanzi : type === "topics" ? "Topik" : "Grammar"}
          </h2>
          <button type="button" onClick={onClose} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface">
            close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-md">
          {fields.map((f) => (
            <label key={f.key} className="block">
              <span className="font-label-md text-label-md text-on-surface-variant block mb-xs">{f.label}</span>
              {f.type === "select" ? (
                <select
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full bg-surface border border-unripe-pale rounded-lg px-md py-sm font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {f.options?.map((o) => (
                    <option key={o} value={o}>{o === "SHUXIE" ? "书写 (Must-Write)" : o === "RENDU" ? "认读 (Recognition)" : o}</option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  rows={3}
                  className="w-full bg-surface border border-unripe-pale rounded-lg px-md py-sm font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                />
              ) : (
                <input
                  type="text"
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full bg-surface border border-unripe-pale rounded-lg px-md py-sm font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </label>
          ))}

          <div className="flex gap-md pt-sm">
            <button
              type="submit"
              disabled={pending}
              className="px-xl py-sm rounded-lg font-label-md text-label-md bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {pending ? "Menyimpan..." : "Simpan"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-xl py-sm rounded-lg font-label-md text-label-md bg-surface-container-highest text-on-surface hover:opacity-90 transition-opacity"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

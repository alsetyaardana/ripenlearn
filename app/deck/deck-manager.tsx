// app/deck/deck-manager.tsx
// Client component untuk interaksi deck: list deck sebagai kartu yang bisa
// diklik, modal per deck (pilih level HSK / kategori Daily Talk untuk menambah
// kartu, atau Browse Kartu), create deck, hapus deck dengan konfirmasi.
// Semua mutasi lewat API server (app/api/deck/*) — komponen tidak pernah
// memegang business logic.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import type { DeckSummary } from "@/lib/deck";
import CardBrowser from "./card-browser";

interface HskLevelEntry {
  level: number;
  count: number;
}

interface CategoryEntry {
  category: string;
  count: number;
}

// Jenis materi yang ditawarkan modal deck: level HSK resmi (1-7) atau
// kategori tema Daily Talk. Ditentukan server per deck (GET /api/deck/levels).
type CurriculumKind = "hsk" | "category";

// View di dalam modal deck: "picker" (pilih level/kategori) vs "browse" (browser kartu).
type ModalView = "picker" | "browse";

interface DeckManagerProps {
  initialDecks: DeckSummary[];
}

// Penanda band untuk level HSK yang tersedia di data (1-7).
// Catatan: level 7 di DB mencakup materi HSK 7, 8, dan 9 gabungan —
// sumber data CSV tidak membedakan ketiganya.
const HSK_LEVEL_BAND_KEY: Record<number, string> = {
  1: "deck.bandBeginner",
  2: "deck.bandElementary",
  3: "deck.bandPreIntermediate",
  4: "deck.bandIntermediate",
  5: "deck.bandUpperIntermediate",
};

const CATEGORY_KEYS: Record<string, string> = {
  daily: "deck.categoryDaily",
  food: "deck.categoryFood",
  travel: "deck.categoryTravel",
  home: "deck.categoryHome",
  health: "deck.categoryHealth",
  money: "deck.categoryMoney",
  work: "deck.categoryWork",
  emotion: "deck.categoryEmotion",
  tech: "deck.categoryTech",
  romance: "deck.categoryRomance",
};

export default function DeckManager({ initialDecks }: DeckManagerProps) {
  const { t } = useLanguage();
  const [decks, setDecks] = useState<DeckSummary[]>(initialDecks);
  const [newDeckName, setNewDeckName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal deck — deck yang sedang dibuka (null = tertutup).
  const [modalDeck, setModalDeck] = useState<DeckSummary | null>(null);
  const [modalView, setModalView] = useState<ModalView>("picker");

  // Hapus deck — konfirmasi inline per kartu
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Material picker HSK / kategori (per deck)
  const [curriculumKind, setCurriculumKind] = useState<CurriculumKind>("hsk");
  const [hskLevels, setHskLevels] = useState<HskLevelEntry[]>([]);
  const [categories, setCategories] = useState<CategoryEntry[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [addingLevels, setAddingLevels] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Indeterminate checkbox "pilih semua level"
  const selectAllRef = useRef<HTMLInputElement>(null);

  const refreshDecks = useCallback(async () => {
    const res = await fetch("/api/deck");
    if (!res.ok) return;
    const data: { decks: DeckSummary[] } = await res.json();
    setDecks(data.decks);
    // jaga modalDeck tetap sinkron dengan data terbaru
    setModalDeck((cur) => {
      if (!cur) return cur;
      const updated = data.decks.find((d) => d.id === cur.id);
      return updated ?? cur;
    });
  }, []);

  const createDeck = useCallback(async () => {
    const name = newDeckName.trim();
    if (!name || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? t("deck.errorCreate"));
        return;
      }
      const data: { deck: DeckSummary } = await res.json();
      setNewDeckName("");
      await refreshDecks();
    } catch {
      setError(t("deck.errorCreate"));
    } finally {
      setCreating(false);
    }
  }, [newDeckName, creating, refreshDecks, t]);

  const deleteDeck = useCallback(
    async (deckId: string) => {
      if (deleting) return;
      setDeleting(true);
      setError(null);
      setSuccessMsg(null);
      try {
        const res = await fetch(`/api/deck/${deckId}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? t("deck.errorDelete"));
          return;
        }
        setConfirmingDeleteId(null);
        setModalDeck((cur) => (cur?.id === deckId ? null : cur));
        await refreshDecks();
      } catch {
        setError(t("deck.errorDelete"));
      } finally {
        setDeleting(false);
      }
    },
    [deleting, refreshDecks, t]
  );

  // Buka modal deck + muat materi (level HSK / kategori Daily Talk) sesuai deck.
  const openDeck = useCallback((deck: DeckSummary) => {
    setModalDeck(deck);
    setModalView("picker");
    setSelectedIds([]);
    setQuery("");
    setConfirmingDeleteId(null);
    setSuccessMsg(null);
    setError(null);
  }, []);

  // Muat materi (level HSK / kategori Daily Talk) sesuai deck yang dibuka.
  useEffect(() => {
    if (!modalDeck) {
      setCurriculumKind("hsk");
      setHskLevels([]);
      setCategories([]);
      setSelectedLevels([]);
      setSelectedCategories([]);
      return;
    }
    let cancelled = false;
    setCurriculumKind("hsk");
    setHskLevels([]);
    setCategories([]);
    setSelectedLevels([]);
    setSelectedCategories([]);
    fetch(`/api/deck/levels?deckId=${encodeURIComponent(modalDeck.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data:
            | { kind: CurriculumKind; levels: HskLevelEntry[]; categories?: never }
            | { kind: CurriculumKind; categories: CategoryEntry[]; levels?: never }
            | null
        ) => {
          if (cancelled || !data) return;
          setCurriculumKind(data.kind);
          if (data.kind === "category") setCategories(data.categories ?? []);
          else setHskLevels(data.levels ?? []);
        }
      )
      .catch(() => {
        if (!cancelled) {
          setHskLevels([]);
          setCategories([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [modalDeck]);

  const toggleLevel = useCallback((level: number) => {
    setSelectedLevels((cur) =>
      cur.includes(level) ? cur.filter((l) => l !== level) : [...cur, level]
    );
  }, []);

  const allLevelsSelected = hskLevels.length > 0 && selectedLevels.length === hskLevels.length;
  const someLevelsSelected =
    selectedLevels.length > 0 && selectedLevels.length < hskLevels.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someLevelsSelected;
    }
  }, [someLevelsSelected]);

  const toggleAllLevels = useCallback(() => {
    setSelectedLevels((cur) =>
      cur.length === hskLevels.length ? [] : hskLevels.map((h) => h.level)
    );
  }, [hskLevels]);

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories((cur) =>
      cur.includes(category) ? cur.filter((c) => c !== category) : [...cur, category]
    );
  }, []);

  const allCategoriesSelected =
    categories.length > 0 && selectedCategories.length === categories.length;

  const toggleAllCategories = useCallback(() => {
    setSelectedCategories((cur) =>
      cur.length === categories.length ? [] : categories.map((c) => c.category)
    );
  }, [categories]);

  const addSelectedMaterials = useCallback(async () => {
    if (!modalDeck || addingLevels) return;
    const isHsk = curriculumKind === "hsk";
    if ((isHsk && selectedLevels.length === 0) || (!isHsk && selectedCategories.length === 0)) {
      return;
    }
    setAddingLevels(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/deck/${modalDeck.id}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isHsk ? { hskLevel: selectedLevels } : { categories: selectedCategories }
        ),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? t("deck.errorAddCards"));
        return;
      }
      const data: { added?: number } = await res.json();
      const added = data.added ?? 0;
      setSelectedLevels([]);
      setSelectedCategories([]);
      setSuccessMsg(
        added > 0
          ? t("deck.successAdded", { count: added })
          : isHsk
            ? t("deck.allWordsExist")
            : t("deck.allWordsInCategoryExist")
      );
      await refreshDecks();
    } catch {
      setError(t("deck.errorAddCards"));
    } finally {
      setAddingLevels(false);
    }
  }, [modalDeck, addingLevels, curriculumKind, selectedLevels, selectedCategories, refreshDecks, t]);

  // Pencarian global cards — debounce sederhana via interval di effect.
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!modalDeck || query.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cards?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) return;
        const data: { cards: SearchCard[] } = await res.json();
        setSearchResults(data.cards);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, modalDeck]);

  const addSelectedCards = useCallback(async () => {
    if (!modalDeck || selectedIds.length === 0 || adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/deck/${modalDeck.id}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: selectedIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? t("deck.errorAddCards"));
        return;
      }
      setSelectedIds([]);
      setQuery("");
      await refreshDecks();
    } catch {
      setError(t("deck.errorAddCards"));
    } finally {
      setAdding(false);
    }
  }, [modalDeck, selectedIds, adding, refreshDecks, t]);

  const toggleCard = useCallback((id: string) => {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }, []);

  const totalCount = (deck: DeckSummary) => deck.totalCardCount;

  return (
    <div className="flex flex-col gap-lg">
      {error && (
        <p className="font-body-md text-body-md text-error bg-error-container rounded-lg p-sm">
          {error}
        </p>
      )}

      {/* Deck list — setiap deck = kartu yang bisa diklik */}
      <section className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale">
        <h2 className="font-headline-md text-headline-md text-primary mb-md">{t("deck.management")}</h2>
        <h1 className="font-display-lg text-display-lg text-primary mb-lg">{t("deck.title")}</h1>
        {decks.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            {t("deck.noDecks")}
          </p>
        ) : (
          <ul className="grid gap-md sm:grid-cols-2">
            {decks.map((deck) => (
              <li key={deck.id}>
                <div
                  className={`flex flex-col h-full rounded-xl border p-md transition-colors ${
                    confirmingDeleteId === deck.id
                      ? "border-error"
                      : "border-unripe-pale hover:border-primary"
                  } bg-surface-container-lowest`}
                >
                  <button
                    onClick={() => openDeck(deck)}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-sm">
                      <span className="font-headline-md text-headline-md text-primary truncate">
                        {deck.name}
                      </span>
                      <span className="font-body-md text-body-md text-on-surface-variant shrink-0">
                        {t("deck.cardCount", { count: totalCount(deck) })}
                      </span>
                    </div>
                    {deck.description && (
                      <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
                        {deck.description}
                      </p>
                    )}
                  </button>
                  <div className="mt-sm border-t border-outline-variant/40 pt-sm flex items-center justify-between gap-sm">
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      {t("deck.clickToManage")}
                    </span>
                    <button
                      onClick={() => {
                        setConfirmingDeleteId((cur) => (cur === deck.id ? null : deck.id));
                        setSuccessMsg(null);
                        setError(null);
                      }}
                      className="shrink-0 px-sm py-xs rounded hover:bg-error-container text-error font-body-md text-body-md transition-colors"
                      aria-label={`Hapus deck ${deck.name}`}
                    >
                      Hapus
                    </button>
                  </div>
                  {confirmingDeleteId === deck.id && (
                    <div className="mt-sm border-t border-outline-variant/40 pt-sm">
                      <p className="font-body-md text-body-md text-on-surface-variant mb-sm">
                        <span dangerouslySetInnerHTML={{ __html: t("deck.confirmDelete", { name: deck.name }) }} />
                      </p>
                      <div className="flex gap-sm">
                        <button
                          onClick={() => deleteDeck(deck.id)}
                          disabled={deleting}
                          className="bg-error hover:bg-error-container text-on-error px-lg py-sm rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm disabled:opacity-40"
                        >
                          {deleting ? t("deck.deleting") : t("deck.deleteDeck")}
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={deleting}
                          className="border border-outline-variant rounded-lg px-lg py-sm font-body-md text-body-md text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-40"
                        >
                          {t("deck.cancel")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Create deck */}
      <section className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale">
        <h2 className="font-headline-md text-headline-md text-primary mb-md">{t("deck.createNew")}</h2>
        <div className="flex flex-col sm:flex-row gap-sm">
          <input
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createDeck()}
            placeholder={t("deck.namePlaceholder")}
            className="flex-1 px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md"
          />
          <button
            onClick={createDeck}
            disabled={creating || !newDeckName.trim()}
            className="w-full sm:w-auto bg-primary hover:bg-primary-container text-on-primary px-lg py-sm rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm disabled:opacity-40"
          >
            {creating ? t("deck.creating") : t("deck.createDeck")}
          </button>
        </div>
      </section>

      {/* Modal deck — pilih level/kategori atau Browse Kartu */}
      {modalDeck && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto p-md"
          onClick={() => setModalDeck(null)}
        >
          <div
            className="w-full max-w-5xl my-lg bg-surface-container-low rounded-xl border border-unripe-pale shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-sm p-lg border-b border-outline-variant/40">
              <div className="min-w-0">
                <h2 className="font-headline-md text-headline-md text-primary truncate">
                  {modalDeck.name}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {t("deck.cardCount", { count: totalCount(modalDeck) })}
                </p>
              </div>
              <div className="flex items-center gap-sm">
                {modalView === "picker" ? (
                  <button
                    onClick={() => setModalView("browse")}
                    className="px-md py-sm rounded-lg border border-outline-variant font-body-md text-body-md text-on-surface-variant hover:bg-surface-variant transition-colors"
                  >
                    {t("deck.browse")}
                  </button>
                ) : (
                  <button
                    onClick={() => setModalView("picker")}
                    className="px-md py-sm rounded-lg border border-outline-variant font-body-md text-body-md text-on-surface-variant hover:bg-surface-variant transition-colors"
                  >
                    ← {t("deck.backToPicker")}
                  </button>
                )}
                <button
                  onClick={() => setModalDeck(null)}
                  aria-label="Tutup"
                  className="flex items-center justify-center p-sm rounded-lg hover:bg-surface-variant text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-lg overflow-y-auto">
              {successMsg && (
                <p
                  role="status"
                  className="font-body-md text-body-md text-on-secondary-container bg-secondary-container border border-secondary rounded-lg p-sm mb-md"
                >
                  <span className="material-symbols-outlined align-middle text-[18px] mr-xs">
                    check_circle
                  </span>
                  {successMsg}
                </p>
              )}

              {modalView === "browse" ? (
                <CardBrowser deckId={modalDeck.id} deckKind={modalDeck.kind} />
              ) : (
                <>
                  {curriculumKind === "category" ? (
                    <>
                      <h3 className="font-headline-md text-headline-md text-on-surface-variant mb-xs">
                        {t("deck.addFromCategory")}
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant mb-sm">
                        {t("deck.addFromCategoryDesc")}
                      </p>

                      {categories.length === 0 ? (
                        <p className="font-body-md text-body-md text-on-surface-variant mb-sm">
                          {t("deck.loadingMaterials")}
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-col gap-xs mb-sm border border-outline-variant/40 rounded-lg p-sm bg-surface-container-lowest">
                            <label className="flex items-center gap-sm px-sm py-xs rounded hover:bg-surface-container cursor-pointer">
                              <input
                                type="checkbox"
                                checked={allCategoriesSelected}
                                onChange={toggleAllCategories}
                              />
                              <span className="font-body-md text-body-md text-on-surface">
                                {t("deck.selectAllCategories")}
                              </span>
                              <span className="font-body-md text-body-md text-on-surface-variant ml-auto">
                                {selectedCategories.reduce(
                                  (sum, c) =>
                                    sum + (categories.find((x) => x.category === c)?.count ?? 0),
                                  0
                                )}{" "}
                                {t("deck.wordsSelected")}
                              </span>
                            </label>
                            <div className="border-t border-outline-variant/40" />
                            {categories.map((c) => (
                              <label
                                key={c.category}
                                className="flex items-center gap-sm px-sm py-xs rounded hover:bg-surface-container cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCategories.includes(c.category)}
                                  onChange={() => toggleCategory(c.category)}
                                />
                                <span className="font-body-md text-body-md text-on-surface font-medium">
                                  {t(CATEGORY_KEYS[c.category] ?? c.category)}
                                </span>
                                <span className="font-body-md text-body-md text-on-surface-variant">
                                  {t("deck.wordsCount", { count: c.count })}
                                </span>
                              </label>
                            ))}
                          </div>
                          <button
                            onClick={addSelectedMaterials}
                            disabled={addingLevels || selectedCategories.length === 0}
                            className="w-full sm:w-auto bg-primary hover:bg-primary-container text-on-primary px-lg py-sm rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm disabled:opacity-40"
                          >
                            {addingLevels
                              ? t("deck.adding")
                              : t("deck.addWordsToDeck", {
                                  count: selectedCategories.reduce(
                                    (sum, c) =>
                                      sum + (categories.find((x) => x.category === c)?.count ?? 0),
                                    0
                                  ),
                                })}
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="font-headline-md text-headline-md text-on-surface-variant mb-xs">
                        {t("deck.addFromHSK")}
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant mb-sm">
                        {t("deck.addFromHSKDesc")}
                      </p>

                      {hskLevels.length === 0 ? (
                        <p className="font-body-md text-body-md text-on-surface-variant mb-sm">
                          {t("deck.loadingLevels")}
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-col gap-xs mb-sm border border-outline-variant/40 rounded-lg p-sm bg-surface-container-lowest">
                            <label className="flex items-center gap-sm px-sm py-xs rounded hover:bg-surface-container cursor-pointer">
                              <input
                                type="checkbox"
                                ref={selectAllRef}
                                checked={allLevelsSelected}
                                onChange={toggleAllLevels}
                              />
                              <span className="font-body-md text-body-md text-on-surface">
                                {t("deck.selectAllLevels")}
                              </span>
                              <span className="font-body-md text-body-md text-on-surface-variant ml-auto">
                                {selectedLevels.reduce(
                                  (sum, l) => sum + (hskLevels.find((h) => h.level === l)?.count ?? 0),
                                  0
                                )}{" "}
                                {t("deck.wordsSelected")}
                              </span>
                            </label>
                            <div className="border-t border-outline-variant/40" />
                            {hskLevels.map((h) => (
                              <label
                                key={h.level}
                                className="flex items-center gap-sm px-sm py-xs rounded hover:bg-surface-container cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedLevels.includes(h.level)}
                                  onChange={() => toggleLevel(h.level)}
                                />
                                <span className="font-body-md text-body-md text-on-surface font-medium">
                                  HSK {h.level}
                                </span>
                                <span className="font-body-md text-body-md text-on-surface-variant">
                                  {t("deck.wordsCount", { count: h.count })}
                                </span>
                                {HSK_LEVEL_BAND_KEY[h.level] && (
                                  <span className="font-label-caps text-label-caps text-on-surface-variant ml-auto rounded bg-surface-container px-sm py-xs">
                                    {t(HSK_LEVEL_BAND_KEY[h.level])}
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                          <button
                            onClick={addSelectedMaterials}
                            disabled={addingLevels || selectedLevels.length === 0}
                            className="w-full sm:w-auto bg-primary hover:bg-primary-container text-on-primary px-lg py-sm rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm disabled:opacity-40"
                          >
                            {addingLevels
                              ? t("deck.adding")
                              : t("deck.addWordsToDeck", {
                                  count: selectedLevels.reduce(
                                    (sum, l) => sum + (hskLevels.find((h) => h.level === l)?.count ?? 0),
                                    0
                                  ),
                                })}
                          </button>
                        </>
                      )}

                      <div className="border-t border-outline-variant/40 my-md" />

                      <h3 className="font-headline-md text-headline-md text-on-surface-variant mb-sm">
                        {t("deck.searchWords")}
                      </h3>
                      <div className="flex gap-sm mb-sm">
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder={t("deck.searchPlaceholder")}
                          className="flex-1 px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md"
                        />
                      </div>

                      {searching && (
                        <p className="font-body-md text-body-md text-on-surface-variant mb-sm">{t("deck.searching")}</p>
                      )}
                      {query.trim().length >= 1 && !searching && searchResults.length === 0 && (
                        <p className="font-body-md text-body-md text-on-surface-variant mb-sm">
                          {t("deck.noResults")}
                        </p>
                      )}
                      {searchResults.length > 0 && (
                        <div className="flex flex-col gap-xs mb-sm max-h-64 overflow-y-auto border border-outline-variant/40 rounded-lg p-sm bg-surface-container-lowest">
                          {searchResults.map((card) => (
                            <label
                              key={card.id}
                              className="flex items-center gap-sm px-sm py-xs rounded hover:bg-surface-container cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(card.id)}
                                onChange={() => toggleCard(card.id)}
                              />
                              <span className="font-body-lg text-body-lg text-on-surface">{card.hanzi}</span>
                              <span className="font-body-md text-body-md text-on-surface-variant">
                                {card.pinyin}
                              </span>
                              <span className="font-body-md text-body-md text-on-surface-variant ml-auto">
                                HSK{card.hskLevel} · {card.tipe === "SHUXIE" ? "书写" : "认读"}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                      {searchResults.length > 0 && (
                        <button
                          onClick={addSelectedCards}
                          disabled={adding || selectedIds.length === 0}
                          className="w-full sm:w-auto bg-primary hover:bg-primary-container text-on-primary px-lg py-sm rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm disabled:opacity-40"
                        >
                          {adding ? t("deck.adding") : t("deck.addCardsToDeck", { count: selectedIds.length })}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchCard {
  id: string;
  hanzi: string;
  pinyin: string;
  artiId: string;
  hskLevel: number;
  tipe: "SHUXIE" | "RENDU";
}

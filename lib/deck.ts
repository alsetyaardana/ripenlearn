// lib/deck.ts
// Dipegang oleh: srs-engine-agent (koordinasi dengan db-schema-agent untuk schema Deck)
// Logic deck custom per user: subset dari Card global + custom card buatan sendiri.
//
// Model: satu Deck bisa berisi campuran DUA sumber:
//   1. DeckCard  -> referensi ke Card global (HSK 3.0 resmi), user tinggal pilih subset
//   2. CustomCard -> kartu yang user buat sendiri, scoped ke satu Deck tertentu
//
// Review session, FSRS progress, dan vocab-gate untuk AI HARUS menggabungkan kedua
// sumber ini saat membangun "kartu yang due" atau "vocab mastered" milik user.

export interface DeckSummary {
  id: string;
  name: string;
  description: string | null;
  globalCardCount: number;
  customCardCount: number;
}

/**
 * Buat deck baru untuk user.
 * TODO(srs-engine-agent): implementasikan lewat Prisma.
 */
export async function createDeck(userId: string, name: string, description?: string) {
  throw new Error("Not implemented — lihat lib/deck.ts TODO");
}

/**
 * Tambah subset Card global ke deck (misal user pilih "semua kata HSK 3 kategori makanan").
 * TODO(srs-engine-agent): implementasikan bulk insert ke DeckCard, idempotent (upsert/skip duplicate).
 */
export async function addGlobalCardsToDeck(deckId: string, cardIds: string[]) {
  throw new Error("Not implemented — lihat lib/deck.ts TODO");
}

/**
 * Tambah custom card buatan user sendiri ke deck.
 * TODO(srs-engine-agent): implementasikan insert ke CustomCard.
 */
export async function addCustomCardToDeck(
  deckId: string,
  userId: string,
  data: { hanzi: string; pinyin: string; arti: string; hskLevel?: number; exampleSentence?: string }
) {
  throw new Error("Not implemented — lihat lib/deck.ts TODO");
}

/**
 * Ambil semua kartu (global + custom) dalam satu deck, digabung jadi satu list
 * untuk keperluan review session.
 * TODO(srs-engine-agent): implementasikan query gabungan + normalisasi field
 * (Card pakai artiId/artiEn, CustomCard pakai arti tunggal — perlu di-map ke
 * satu shape yang konsisten dipakai UI review).
 */
export async function getDeckCards(deckId: string) {
  throw new Error("Not implemented — lihat lib/deck.ts TODO");
}

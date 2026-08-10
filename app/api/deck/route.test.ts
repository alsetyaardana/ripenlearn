// app/api/deck/route.test.ts
// Test validasi payload & behavior endpoint deck. Route handler memakai auth()
// yang sulit di-mock penuh; fokus test di sini: validasi payload create deck
// (nama wajib, trim) via helper `validateDeckPayload` (lib/deck.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateDeckPayload,
  validateCardIdsPayload,
  validateHskLevelsPayload,
  validateCategoriesPayload,
} from "@/lib/deck";

test("validateDeckPayload menerima nama valid dengan description opsional", () => {
  const result = validateDeckPayload({ name: "HSK 4", description: "fokus kata kerja" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.name, "HSK 4");
    assert.equal(result.value.description, "fokus kata kerja");
  }
});

test("validateDeckPayload menolak nama kosong/blank", () => {
  const blank = validateDeckPayload({ name: "   " });
  assert.equal(blank.ok, false);
  if (!blank.ok) assert.equal(blank.error, "Name is required");

  const missing = validateDeckPayload({});
  assert.equal(missing.ok, false);
});

test("validateDeckPayload mem-trim nama", () => {
  const result = validateDeckPayload({ name: "  Deck Baru  " });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.name, "Deck Baru");
});

// ============================================================
// validateCardIdsPayload — payload { cardIds: string[] }
// ============================================================

test("validateCardIdsPayload menerima array string non-empty", () => {
  const result = validateCardIdsPayload({ cardIds: ["c1", "c2"] });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.cardIds, ["c1", "c2"]);
});

test("validateCardIdsPayload menolak array kosong / bukan array", () => {
  assert.equal(validateCardIdsPayload({ cardIds: [] }).ok, false);
  assert.equal(validateCardIdsPayload({ cardIds: "c1" }).ok, false);
  assert.equal(validateCardIdsPayload({ cardIds: 5 }).ok, false);
  assert.equal(validateCardIdsPayload({}).ok, false);
});

test("validateCardIdsPayload menolak elemen non-string / string blank", () => {
  assert.equal(validateCardIdsPayload({ cardIds: ["c1", 5] }).ok, false);
  assert.equal(validateCardIdsPayload({ cardIds: ["c1", null] }).ok, false);
  assert.equal(validateCardIdsPayload({ cardIds: ["c1", "   "] }).ok, false);
});

// ============================================================
// validateHskLevelsPayload — payload { hskLevel: number | number[] }
// ============================================================

test("validateHskLevelsPayload menerima array level valid", () => {
  const single = validateHskLevelsPayload({ hskLevel: [2] });
  assert.equal(single.ok, true);
  if (single.ok) assert.deepEqual(single.value.hskLevels, [2]);

  const multi = validateHskLevelsPayload({ hskLevel: [1, 2, 5] });
  assert.equal(multi.ok, true);
  if (multi.ok) assert.deepEqual(multi.value.hskLevels, [1, 2, 5]);
});

test("validateHskLevelsPayload menolak array kosong / non-array / di luar 1-9", () => {
  assert.equal(validateHskLevelsPayload({ hskLevel: [] }).ok, false);
  assert.equal(validateHskLevelsPayload({ hskLevel: 3 }).ok, false, "harus array, bukan number tunggal");
  assert.equal(validateHskLevelsPayload({}).ok, false);
  assert.equal(validateHskLevelsPayload({ hskLevel: [0] }).ok, false);
  assert.equal(validateHskLevelsPayload({ hskLevel: [10] }).ok, false);
  assert.equal(validateHskLevelsPayload({ hskLevel: [1, 10] }).ok, false);
});

test("validateHskLevelsPayload menolak elemen non-integer", () => {
  assert.equal(validateHskLevelsPayload({ hskLevel: ["1"] }).ok, false);
  assert.equal(validateHskLevelsPayload({ hskLevel: [1.5] }).ok, false);
});

// ============================================================
// validateCategoriesPayload — payload { categories: string[] }
// ============================================================

test("validateCategoriesPayload menerima array kategori valid", () => {
  const single = validateCategoriesPayload({ categories: ["daily"] });
  assert.equal(single.ok, true);
  if (single.ok) assert.deepEqual(single.value.categories, ["daily"]);

  const multi = validateCategoriesPayload({ categories: ["daily", "tech", "romance"] });
  assert.equal(multi.ok, true);
  if (multi.ok) assert.deepEqual(multi.value.categories, ["daily", "tech", "romance"]);
});

test("validateCategoriesPayload menolak array kosong / bukan array", () => {
  assert.equal(validateCategoriesPayload({ categories: [] }).ok, false);
  assert.equal(validateCategoriesPayload({ categories: "daily" }).ok, false);
  assert.equal(validateCategoriesPayload({}).ok, false);
});

test("validateCategoriesPayload menolak kategori tidak dikenal / blank", () => {
  assert.equal(validateCategoriesPayload({ categories: ["it"] }).ok, false, "it sudah diganti tech");
  assert.equal(validateCategoriesPayload({ categories: ["daily", ""] }).ok, false);
  assert.equal(validateCategoriesPayload({ categories: [5] }).ok, false);
});

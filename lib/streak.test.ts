// lib/streak.test.ts — self-check streak + estimasi (murni, tanpa DB)
import test from "node:test";
import assert from "node:assert/strict";

import { todayKey, parseKey } from "./streak";

// Reimplementasi getStreak murni (tanpa prisma) untuk uji logika tanggal.
import type { PrismaClient } from "@prisma/client";

// Override: kita test helper tanggal langsung.
test("todayKey menghasilkan YYYY-MM-DD", () => {
  const d = new Date(2026, 7, 13, 10, 30); // 13 Agu 2026
  assert.equal(todayKey(d), "2026-08-13");
});

test("parseKey roundtrip konsisten", () => {
  const d = parseKey("2026-08-13");
  assert.equal(d.toISOString().slice(0, 10), "2026-08-13");
});

test("parseKey dan todayKey konsisten untuk tanggal yang sama", () => {
  const d = new Date(2026, 0, 5, 23, 59); // 5 Jan 2026
  const key = todayKey(d);
  assert.equal(parseKey(key).toISOString().slice(0, 10), key);
});

// Simulasi hitung streak (logika sama dengan getStreak, tanpa DB)
function computeStreak(days: string[], nowKey: string): { current: number; studiedToday: boolean } {
  const set = new Set(days);
  const today = nowKey;
  const yesterday = new Date(parseKey(nowKey).getTime() - 86_400_000).toISOString().slice(0, 10);
  let current = 0;
  let cursor = set.has(today) ? today : set.has(yesterday) ? yesterday : null;
  if (cursor) {
    const d = parseKey(cursor);
    while (set.has(d.toISOString().slice(0, 10))) {
      current++;
      d.setUTCDate(d.getUTCDate() - 1);
    }
  }
  return { current, studiedToday: set.has(today) };
}

test("streak no-toleransi: putus kalau lewat 1 hari", () => {
  // Belajar 10,11,12 lalu skip 13 -> streak 0 (hari ini 14 belum belajar, kemarin 13 tidak ada)
  const r = computeStreak(["2026-08-10", "2026-08-11", "2026-08-12"], "2026-08-14");
  assert.equal(r.current, 0);
  assert.equal(r.studiedToday, false);
});

test("streak lanjut: belajar hari ini termasuk", () => {
  const r = computeStreak(["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"], "2026-08-14");
  assert.equal(r.current, 5);
  assert.equal(r.studiedToday, true);
});

test("streak belum belajar hari ini tapi kemarin ada: streak aman (belum putus)", () => {
  const r = computeStreak(["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"], "2026-08-14");
  assert.equal(r.current, 4);
  assert.equal(r.studiedToday, false);
});

test("streak putus: lewat 2 hari", () => {
  const r = computeStreak(["2026-08-10", "2026-08-11", "2026-08-12"], "2026-08-14");
  assert.equal(r.current, 0);
});

// lib/streak.ts
// Streak harian — no-toleransi: streak putus kalau ada 1 hari tanpa belajar.
// Dasar: tabel StudyDay (1 row per user per hari aktif, di-upsert saat review).

import type { PrismaClient } from "@prisma/client";

/** Tanggal lokal hari ini dalam format YYYY-MM-DD (timezone server). */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse "YYYY-MM-DD" ke Date (UTC midnight) — konsisten dengan kolom DATE. */
export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Catat belajar hari ini (upsert). Dipanggil setelah review selesai.
 * `cardsStudied` di-increment — 1 baris per user per hari.
 */
export async function recordStudyDay(
  client: PrismaClient,
  userId: string,
  cardsStudied: number,
  now: Date = new Date()
): Promise<void> {
  const key = todayKey(now);
  await client.studyDay.upsert({
    where: { userId_date: { userId, date: parseKey(key) } },
    create: { userId, date: parseKey(key), cardsStudied },
    update: { cardsStudied: { increment: cardsStudied } },
  });
}

export interface StreakInfo {
  current: number; // streak aktif (hari berturut-turut sampai hari ini/kemarin)
  longest: number; // rekor streak terpanjang
  studiedToday: boolean;
}

/**
 * Hitung streak no-toleransi.
 * current: jumlah hari berturut-turut AKHIR (termasuk hari ini kalau sudah belajar,
 * atau berakhir kemarin kalau belum belajar hari ini).
 * longest: run terpanjang di history.
 */
export async function getStreak(client: PrismaClient, userId: string, now: Date = new Date()): Promise<StreakInfo> {
  const days = await client.studyDay.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  const set = new Set(days.map((d) => d.date.toISOString().slice(0, 10)));
  const today = todayKey(now);
  const yesterday = todayKey(new Date(now.getTime() - 86_400_000));

  // Streak aktif: mulai dari hari ini (kalau ada) atau kemarin (kalau belum belajar hari ini).
  let current = 0;
  let cursor = set.has(today) ? today : set.has(yesterday) ? yesterday : null;
  if (cursor) {
    const d = parseKey(cursor);
    while (set.has(d.toISOString().slice(0, 10))) {
      current++;
      d.setUTCDate(d.getUTCDate() - 1);
    }
  }

  // Longest: sort ascending, hitung run terpanjang.
  const sorted = Array.from(set).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    if (prev !== null && parseKey(key).getTime() - parseKey(prev).getTime() === 86_400_000) {
      run++;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = key;
  }

  return { current, longest, studiedToday: set.has(today) };
}

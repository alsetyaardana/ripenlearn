// lib/fsrs.test.ts
// Test FSRS scheduling — Card global (CardProgress) dan CustomCard
// (CustomCardProgress) harus dijadwalkan dengan logic yang sama dan menghasilkan
// dueDate/stability yang konsisten untuk input rating yang sama.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scheduleReview, isMastered } from "./fsrs";
import { CardStatus } from "@prisma/client";

function baseProgress(overrides: Partial<Parameters<typeof scheduleReview>[0]> = {}) {
  return {
    stability: 0,
    difficulty: 0,
    dueDate: new Date(Date.now() - 86400000), // sudah lewat due
    reviewCount: 0,
    lapses: 0,
    consecutiveSuccess: 0,
    status: CardStatus.NEW,
    lastReviewedAt: null,
    ...overrides,
  };
}

test("rating good menaikkan stability dan dueDate", () => {
  const result = scheduleReview(baseProgress(), "good");
  assert.ok(result.stability > 0, "stability harus > 0 setelah good");
  assert.ok(result.dueDate.getTime() > Date.now(), "dueDate harus di masa depan");
  assert.equal(result.reviewCount, 1);
  assert.equal(result.lapses, 0);
});

test("rating again pada kartu yang sudah Review menambah lapses", () => {
  // FSRS: lapses hanya bertambah untuk kartu yang lapse dari state Review/Relearning.
  // Simulasikan kartu yang sudah stabil dengan beberapa review.
  const reviewed = baseProgress({
    reviewCount: 3,
    stability: 8,
    difficulty: 0.3,
    status: CardStatus.REVIEW,
    lastReviewedAt: new Date(Date.now() - 3 * 86400000),
  });
  const result = scheduleReview(reviewed, "again");
  assert.equal(result.lapses, 1, "again harus menambah lapses untuk kartu Review");
});

test("rating easy menghasilkan dueDate lebih jauh dari good", () => {
  const good = scheduleReview(baseProgress(), "good");
  const easy = scheduleReview(baseProgress(), "easy");
  assert.ok(
    easy.dueDate.getTime() > good.dueDate.getTime(),
    "easy harus menjadwalkan lebih jauh dari good"
  );
});

test("isMastered: stability >= 21 hari berarti mastered", () => {
  assert.equal(isMastered(21, 0), true);
  assert.equal(isMastered(20.99, 0), false);
});

test("isMastered: 3 review sukses berturut-turut berarti mastered", () => {
  assert.equal(isMastered(0, 3), true);
  assert.equal(isMastered(0, 2), false);
});

// ============================================================
// consecutiveSuccess — counter review sukses berturut-turut
// ============================================================

test("consecutiveSuccess: good dan easy menaikkan counter", () => {
  const good = scheduleReview(baseProgress({ consecutiveSuccess: 1 }), "good");
  assert.equal(good.consecutiveSuccess, 2, "good harus menambah consecutiveSuccess");

  const easy = scheduleReview(baseProgress({ consecutiveSuccess: 1 }), "easy");
  assert.equal(easy.consecutiveSuccess, 2, "easy harus menambah consecutiveSuccess");
});

test("consecutiveSuccess: hard mempertahankan counter (hanya again yang reset)", () => {
  const hard = scheduleReview(baseProgress({ consecutiveSuccess: 2 }), "hard");
  assert.equal(hard.consecutiveSuccess, 2, "hard tidak boleh mengubah counter");
});

test("consecutiveSuccess: again mereset counter ke 0", () => {
  const again = scheduleReview(baseProgress({ consecutiveSuccess: 2 }), "again");
  assert.equal(again.consecutiveSuccess, 0, "again harus mereset consecutiveSuccess ke 0");
});

test("status MASTERED saat consecutiveSuccess mencapai 3", () => {
  const result = scheduleReview(baseProgress({ consecutiveSuccess: 2 }), "good");
  assert.equal(result.status, CardStatus.MASTERED, "3 sukses berturut-turut harus MASTERED");
  assert.equal(result.consecutiveSuccess, 3);
});

// NOTE: Konsistensi Card vs CustomCard dijamin karena keduanya memanggil
// `scheduleReview` yang sama (lihat lib/fsrs.ts) — tidak ada jalur terpisah.
test("scheduleReview mengembalikan shape yang siap ditulis ke CardProgress & CustomCardProgress", () => {
  const result = scheduleReview(baseProgress(), "hard");
  const keys = ["stability", "difficulty", "dueDate", "reviewCount", "lapses", "status", "lastReviewedAt"];
  for (const key of keys) {
    assert.ok(key in result, `result harus punya field ${key}`);
  }
});

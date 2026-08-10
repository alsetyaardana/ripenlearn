// lib/quota.test.ts
// Test quota: fail-closed saat Redis unavailable, UNLIMITED tidak pernah throw,
// UsageLog dicatat, dan tier limits untuk chat/exam/reading + new cards.
// Redis di-inject (fake) supaya tidak butuh Redis live.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createQuotaManager,
  RedisUnavailableError,
  getTierLimits,
  getDailyNewCardLimit,
  getLimit,
  TIER_INFO,
} from "./quota";

function makeFakeRedis(overrides: Partial<Record<"incr" | "expire" | "get", Function>> = {}) {
  const calls: string[] = [];
  const state = new Map<string, number>();
  const redis: Record<string, Function> = {
    incr: async (key: string) => {
      calls.push(`incr:${key}`);
      const next = (state.get(key) ?? 0) + 1;
      state.set(key, next);
      return next;
    },
    expire: async (key: string) => {
      calls.push(`expire:${key}`);
      return 1;
    },
    get: async (key: string) => {
      calls.push(`get:${key}`);
      return String(state.get(key) ?? 0);
    },
    ...overrides,
  };
  return { redis, calls };
}

// --- Existing tests (unchanged) ---

test("checkQuota untuk FREE memblokir setelah limit tercapai", async () => {
  const { redis } = makeFakeRedis();
  const quota = createQuotaManager(redis as never);

  let last;
  for (let i = 0; i < 20; i++) {
    last = await quota.checkQuota("user-1", "chat", "FREE");
  }
  assert.equal(last!.remaining, 0);

  await assert.rejects(
    () => quota.checkQuota("user-1", "chat", "FREE"),
    (err: unknown) => (err as { name?: string }).name === "QuotaExceededError"
  );
});

test("checkQuota untuk UNLIMITED tidak pernah throw walau Redis counter tetap naik", async () => {
  const { redis, calls } = makeFakeRedis();
  const quota = createQuotaManager(redis as never);
  for (let i = 0; i < 100; i++) {
    const result = await quota.checkQuota("user-1", "chat", "UNLIMITED");
    assert.equal(result.remaining, null);
  }
  assert.ok(calls.some((c) => c.startsWith("incr:")), "UNLIMITED tetap menaikkan counter Redis");
});

test("Redis down → RedisUnavailableError (fail-closed untuk fitur AI)", async () => {
  const { redis } = makeFakeRedis({
    incr: async () => { throw new Error("ECONNREFUSED"); },
  });
  const quota = createQuotaManager(redis as never);
  await assert.rejects(
    () => quota.checkQuota("user-1", "chat", "FREE"),
    (err: unknown) => err instanceof RedisUnavailableError
  );
});

test("Redis down → UNLIMITED tetap fail-closed (konsisten, tidak mengecualikan)", async () => {
  const { redis } = makeFakeRedis({
    incr: async () => { throw new Error("ECONNREFUSED"); },
  });
  const quota = createQuotaManager(redis as never);
  await assert.rejects(
    () => quota.checkQuota("user-1", "chat", "UNLIMITED"),
    (err: unknown) => err instanceof RedisUnavailableError
  );
});

test("getRemainingQuota mengembalikan sisa untuk tier berlimit", async () => {
  const { redis } = makeFakeRedis();
  const quota = createQuotaManager(redis as never);
  await quota.checkQuota("user-1", "chat", "FREE");
  const remaining = await quota.getRemainingQuota("user-1", "chat", "FREE");
  assert.equal(remaining, 19);
});

test("getRemainingQuota mengembalikan null untuk UNLIMITED", async () => {
  const { redis } = makeFakeRedis();
  const quota = createQuotaManager(redis as never);
  const remaining = await quota.getRemainingQuota("user-1", "chat", "UNLIMITED");
  assert.equal(remaining, null);
});

// --- Tier limits tests ---

test("getTierLimits: FREE returns correct feature limits", () => {
  const limits = getTierLimits("FREE");
  assert.equal(limits.chat, 20);
  assert.equal(limits.exam, 5);
  assert.equal(limits.reading, 5);
});

test("getTierLimits: PREMIUM returns correct feature limits", () => {
  const limits = getTierLimits("PREMIUM");
  assert.equal(limits.chat, 200);
  assert.equal(limits.exam, 50);
  assert.equal(limits.reading, 50);
});

test("getTierLimits: UNLIMITED returns Infinity for all features", () => {
  const limits = getTierLimits("UNLIMITED");
  assert.equal(limits.chat, Infinity);
  assert.equal(limits.exam, Infinity);
  assert.equal(limits.reading, Infinity);
});

test("getLimit: FREE/PREMIUM/UNLIMITED per feature", () => {
  assert.equal(getLimit("chat", "FREE"), 20);
  assert.equal(getLimit("exam", "PREMIUM"), 50);
  assert.equal(getLimit("reading", "UNLIMITED"), null);
});

// --- New card limit tests ---

test("getDailyNewCardLimit: FREE=10, PREMIUM=30, UNLIMITED=50", () => {
  assert.equal(getDailyNewCardLimit("FREE"), 10);
  assert.equal(getDailyNewCardLimit("PREMIUM"), 30);
  assert.equal(getDailyNewCardLimit("UNLIMITED"), 50);
});

// --- Tier-by-tier quota enforcement tests ---

test("checkQuota: PREMIUM memblokir chat setelah 200", async () => {
  const { redis } = makeFakeRedis();
  const quota = createQuotaManager(redis as never);

  // Fast-fill 200
  for (let i = 0; i < 200; i++) {
    await quota.checkQuota("u-prem", "chat", "PREMIUM");
  }
  // Ke-201 harus throw
  await assert.rejects(
    () => quota.checkQuota("u-prem", "chat", "PREMIUM"),
    (err: unknown) => {
      const e = err as { name?: string; limit?: number };
      return e.name === "QuotaExceededError" && e.limit === 200;
    }
  );
});

test("checkQuota: PREMIUM memblokir exam setelah 50", async () => {
  const { redis } = makeFakeRedis();
  const quota = createQuotaManager(redis as never);
  for (let i = 0; i < 50; i++) {
    await quota.checkQuota("u-prem", "exam", "PREMIUM");
  }
  await assert.rejects(
    () => quota.checkQuota("u-prem", "exam", "PREMIUM"),
    (err: unknown) => (err as { name?: string }).name === "QuotaExceededError"
  );
});

test("checkQuota: PREMIUM memblokir reading setelah 50", async () => {
  const { redis } = makeFakeRedis();
  const quota = createQuotaManager(redis as never);
  for (let i = 0; i < 50; i++) {
    await quota.checkQuota("u-prem", "reading", "PREMIUM");
  }
  await assert.rejects(
    () => quota.checkQuota("u-prem", "reading", "PREMIUM"),
    (err: unknown) => (err as { name?: string }).name === "QuotaExceededError"
  );
});

test("checkQuota: FREE memblokir exam setelah 5, reading setelah 5", async () => {
  const { redis } = makeFakeRedis();
  const quota = createQuotaManager(redis as never);

  for (let i = 0; i < 5; i++) {
    await quota.checkQuota("u-free", "exam", "FREE");
  }
  await assert.rejects(
    () => quota.checkQuota("u-free", "exam", "FREE"),
    (err: unknown) => (err as { name?: string }).name === "QuotaExceededError"
  );

  const redis2 = makeFakeRedis();
  const quota2 = createQuotaManager(redis2.redis as never);
  for (let i = 0; i < 5; i++) {
    await quota2.checkQuota("u-free", "reading", "FREE");
  }
  await assert.rejects(
    () => quota2.checkQuota("u-free", "reading", "FREE"),
    (err: unknown) => (err as { name?: string }).name === "QuotaExceededError"
  );
});

// --- TIER_INFO export ---

test("TIER_INFO contains correct data for all tiers", () => {
  assert.equal(TIER_INFO.FREE.features.chat, 20);
  assert.equal(TIER_INFO.FREE.newCards, 10);
  assert.equal(TIER_INFO.PREMIUM.features.chat, 200);
  assert.equal(TIER_INFO.PREMIUM.newCards, 30);
  assert.equal(TIER_INFO.UNLIMITED.features.chat, Infinity);
  assert.equal(TIER_INFO.UNLIMITED.newCards, 50);
});

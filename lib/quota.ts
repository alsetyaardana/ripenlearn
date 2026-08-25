// lib/quota.ts
// Dipegang oleh: quota-agent (.opencode/agent/quota-agent.md)
// Lihat AGENTS.md untuk aturan lengkap sebelum mengubah limit.

import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export type Feature = "chat" | "exam" | "reading" | "call";
export type Tier = "FREE" | "PREMIUM" | "UNLIMITED";

// JANGAN ubah angka ini tanpa konfirmasi eksplisit dari user (lihat AGENTS.md).
const FREE_LIMITS: Record<Feature, number> = {
  chat: 20,
  exam: 5,
  reading: 5,
  call: 3,
};

const PREMIUM_LIMITS: Record<Feature, number> = {
  chat: 200,
  exam: 50,
  reading: 50,
  call: 30,
};

// UNLIMITED tidak dibatasi angka — dipakai untuk akun yang diberi akses penuh
// secara manual (mis. owner, atau orang yang diajak belajar bareng). Tier ini
// TIDAK bisa didapat lewat signup biasa; hanya lewat perubahan manual di DB
// (User.tier = UNLIMITED) atau admin action eksplisit di masa depan.
// checkQuota() untuk tier ini skip pengecekan limit sepenuhnya, tapi tetap
// dicatat di UsageLog/Redis untuk keperluan monitoring biaya DeepSeek.

export class QuotaExceededError extends Error {
  constructor(
    public feature: Feature,
    public limit: number,
    public resetAt: Date
  ) {
    super(`Quota exceeded for ${feature}: limit ${limit}/day`);
    this.name = "QuotaExceededError";
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function quotaKey(userId: string, feature: Feature): string {
  return `quota:${userId}:${feature}:${todayKey()}`;
}

function getLimit(feature: Feature, tier: Tier): number | null {
  if (tier === "UNLIMITED") return null; // null = tidak ada limit
  return tier === "PREMIUM" ? PREMIUM_LIMITS[feature] : FREE_LIMITS[feature];
}

function nextResetAt(): Date {
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow;
}

/**
 * Cek dan increment quota secara atomic. Throw QuotaExceededError kalau sudah lewat limit.
 * Untuk tier UNLIMITED: tetap increment counter (buat monitoring), tapi tidak pernah throw.
 * TODO(quota-agent): implementasikan fail-closed behavior kalau Redis unreachable
 * (kecuali untuk UNLIMITED — didiskusikan dulu apakah tetap fail-closed atau fail-open).
 */
export async function checkQuota(
  userId: string,
  feature: Feature,
  tier: Tier
): Promise<{ remaining: number | null }> {
  const key = quotaKey(userId, feature);
  const limit = getLimit(feature, tier);

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 86400); // TTL 24 jam
  }

  if (limit === null) {
    // UNLIMITED — tidak pernah throw, remaining null menandakan "tak terbatas"
    return { remaining: null };
  }

  if (count > limit) {
    throw new QuotaExceededError(feature, limit, nextResetAt());
  }

  return { remaining: limit - count };
}

/**
 * Cek sisa quota TANPA increment — dipakai UI untuk menampilkan "sisa X hari ini".
 * Return null untuk tier UNLIMITED (UI sebaiknya tampilkan simbol infinity, bukan angka).
 */
export async function getRemainingQuota(
  userId: string,
  feature: Feature,
  tier: Tier
): Promise<number | null> {
  const limit = getLimit(feature, tier);
  if (limit === null) return null;

  const key = quotaKey(userId, feature);
  const current = await redis.get(key);
  const used = current ? parseInt(current, 10) : 0;
  return Math.max(0, limit - used);
}

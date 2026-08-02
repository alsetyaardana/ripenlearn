// lib/prisma.ts
// Singleton PrismaClient — dipakai semua lib/* dan route handler supaya tidak
// membuka koneksi baru tiap hot-reload di dev.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

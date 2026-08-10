// types/next-auth.d.ts
// Augmentasi tipe NextAuth v5 — session.user.id dan session.user.tier dipakai
// lintas route/komponen server. Sumber kebenaran runtime: callback jwt/session
// di lib/auth.ts. Jangan tambah field baru di sini tanpa menambahkan di callback
// tersebut juga.
import type { DefaultSession } from "next-auth";
import type { Tier, Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tier: Tier;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    tier?: Tier;
    role?: Role;
  }
}

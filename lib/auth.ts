// lib/auth.ts
// Dipegang oleh: auth-agent (.opencode/agent/auth-agent.md)
// NextAuth.js (Auth.js) config — Google OAuth only untuk MVP.
// Config edge-safe (dipakai middleware) ada di lib/auth.config.ts — jangan tambah
// adapter/Prisma di sana.

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Tier, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // `user` hanya ada di request sign-in pertama; setelah itu tier dibaca dari
      // token JWT yang sudah dienkode, bukan query Prisma ulang.
      if (user) {
        token.id = user.id;
        // TODO(auth-agent): tier/role bisa berubah di DB (mis. upgrade manual ke
        // UNLIMITED) tapi tidak ter-refresh sampai token expire/re-login — cukup
        // untuk MVP, revisit kalau perlu refresh lebih cepat.
        token.tier = ((user as { tier?: string }).tier ?? "FREE") as Tier;
        token.role = ((user as { role?: string }).role ?? "USER") as Role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tier = (token.tier as Tier) ?? "FREE";
        session.user.role = (token.role as Role) ?? "USER";
      }
      return session;
    },
  },
});

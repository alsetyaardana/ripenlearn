// lib/auth.ts
// Dipegang oleh: auth-agent (.opencode/agent/auth-agent.md)
// NextAuth.js (Auth.js) config — Google OAuth only untuk MVP.
// Config edge-safe (dipakai middleware) ada di lib/auth.config.ts — jangan tambah
// adapter/Prisma di sana.

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
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
        // TODO(auth-agent): tier bisa berubah di DB (mis. upgrade manual ke
        // UNLIMITED) tapi tidak ter-refresh sampai token expire/re-login — cukup
        // untuk MVP, revisit kalau perlu refresh lebih cepat.
        token.tier = (user as { tier?: string }).tier ?? "FREE";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { tier?: string }).tier = (token.tier as string) ?? "FREE";
      }
      return session;
    },
  },
});

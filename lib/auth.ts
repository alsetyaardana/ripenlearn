// lib/auth.ts
// Dipegang oleh: auth-agent (.opencode/agent/auth-agent.md)
// NextAuth.js (Auth.js) config — Google OAuth only untuk MVP.

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // TODO(auth-agent): expose tier dari DB ke session.user, dipakai quota-agent
        // dan ai-integration-agent untuk menentukan limit.
        // Tier bisa "FREE" | "PREMIUM" | "UNLIMITED" — UNLIMITED hanya di-set manual
        // di DB, tidak pernah lewat flow signup otomatis.
        (session.user as any).id = user.id;
        (session.user as any).tier = (user as any).tier ?? "FREE";
      }
      return session;
    },
  },
  pages: {
    // TODO(auth-agent): buat halaman login custom kalau perlu, default NextAuth cukup untuk MVP
  },
});

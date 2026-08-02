// lib/auth.config.ts
// Config edge-safe untuk NextAuth — dipakai middleware.ts. TIDAK boleh import
// PrismaAdapter/PrismaClient di sini karena middleware jalan di Edge Runtime yang
// tidak mendukung Prisma. Config penuh (dengan adapter) ada di lib/auth.ts.
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // JWT (bukan database session) supaya middleware bisa validasi session tanpa
  // query Prisma di Edge Runtime.
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      if (auth?.user) return true;
      // API routes: 401 JSON, bukan redirect ke halaman sign-in HTML — client (fetch)
      // butuh response yang bisa di-parse sebagai JSON, bukan HTML.
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return false;
    },
  },
};

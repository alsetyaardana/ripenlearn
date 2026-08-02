// middleware.ts
// Dipegang oleh: auth-agent
// Proteksi route yang butuh login — redirect ke halaman login kalau belum autentikasi.
// Pakai lib/auth.config.ts (edge-safe, tanpa PrismaAdapter) supaya bisa jalan di Edge
// Runtime; config penuh dengan adapter ada di lib/auth.ts untuk API routes/server components.

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/review/:path*",
    "/chat/:path*",
    "/deck/:path*",
    "/api/review/:path*",
    "/api/chat/:path*",
    "/api/exam/:path*",
    "/api/reading/:path*",
    "/api/deck/:path*",
  ],
};

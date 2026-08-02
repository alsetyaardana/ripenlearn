// middleware.ts
// Dipegang oleh: auth-agent
// Proteksi route yang butuh login — redirect ke halaman login kalau belum autentikasi.

export { auth as middleware } from "@/lib/auth";

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

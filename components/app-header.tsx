// components/app-header.tsx
// Header shared untuk halaman yang tidak punya header sendiri (dashboard, deck).
// Menyediakan link navigasi antar fitur + sign-out. Server component — action
// sign-out dipanggil via form POST ke route signout NextAuth standar.
import Link from "next/link";
import { signOut } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/deck", label: "Deck" },
  { href: "/review", label: "Review" },
  { href: "/chat", label: "Chat" },
  { href: "/reading", label: "Baca" },
  { href: "/tones", label: "Tones" },
  { href: "/exam", label: "Ujian" },
  { href: "/settings", label: "Pengaturan" },
];

export default function AppHeader({ userName }: { userName?: string | null }) {
  return (
    <header className="w-full border-b border-outline-variant/40 bg-surface-container-lowest/80 backdrop-blur-sm">
      <div className="max-w-container-max mx-auto px-sm md:px-lg py-xs flex items-center justify-between gap-sm flex-wrap">
        <div className="flex items-center gap-xs md:gap-sm flex-wrap">
          <Link href="/dashboard" className="font-headline-md text-headline-md text-primary">
            Ripen
          </Link>
          <nav className="flex items-center gap-xs md:gap-sm flex-wrap">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-xs">
          {userName && (
            <span className="font-body-sm text-body-sm text-on-surface-variant hidden sm:inline">
              {userName}
            </span>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-error transition-colors flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Keluar
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

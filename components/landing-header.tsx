// components/landing-header.tsx
// Client component — landing page navbar dengan hamburger menu untuk mobile.
"use client";

import Link from "next/link";
import { useState } from "react";

interface LandingHeaderProps {
  authed: boolean;
}

const NAV_LINKS = [
  { href: "/metodologi", label: "Metodologi" },
  { href: "/kurikulum", label: "Kurikulum" },
  { href: "/eksperimen", label: "Eksperimen" },
  { href: "/referensi", label: "Referensi" },
  { href: "/blog", label: "Blog" },
  { href: "/tentang", label: "Tentang" },
];

export default function LandingHeader({ authed }: LandingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-surface-container-lowest/80 backdrop-blur-md">
      <div className="max-w-container-max mx-auto flex items-center justify-between px-lg py-md">
        <span className="font-headline-md text-headline-md font-bold text-primary shrink-0">Ripen</span>
        <nav className="hidden md:flex gap-lg absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-all">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-sm shrink-0">
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-1 text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined text-[24px]">{menuOpen ? "close" : "menu"}</span>
          </button>
          <Link href={authed ? "/dashboard" : "/login"} className="hidden md:flex font-label-caps text-label-caps text-on-primary bg-primary px-lg py-sm rounded-lg hover:opacity-90 transition-opacity items-center gap-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{authed ? "dashboard" : "login"}</span>
            {authed ? "Buka Dashboard" : "Masuk"}
          </Link>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t border-outline-variant/30 bg-surface-container-lowest">
          <nav className="flex flex-col py-2">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="px-lg py-3 font-body-md text-on-surface-variant hover:bg-surface-container">{link.label}</a>
            ))}
            <a href="/harga" className="px-lg py-3 font-body-md text-on-surface-variant hover:bg-surface-container">Harga</a>
            <div className="border-t border-outline-variant/30 mt-2 pt-2">
              <Link href={authed ? "/dashboard" : "/login"} className="flex items-center gap-2 px-lg py-3 font-body-md text-primary font-semibold" onClick={() => setMenuOpen(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{authed ? "dashboard" : "login"}</span>
                {authed ? "Buka Dashboard" : "Masuk dengan Google"}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

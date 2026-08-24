// app/layout.tsx
import type { Metadata } from "next";
import { Be_Vietnam_Pro, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import { SidebarProvider } from "@/components/sidebar-context";
import { LanguageProvider } from "@/contexts/language-context";
import AppSidebarWrapper from "@/components/app-sidebar-wrapper";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Ripen — Belajar Kosakata Mandarin",
    template: "%s | Ripen",
  },
  description: "Belajar vocab Mandarin sampai matang, baru boleh dipakai ngobrol.",
  metadataBase: new URL("https://ripenlearn.web.id"),
  icons: {
    icon: "/icon.svg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;
  const isLoggedIn = Boolean(user);

  return (
    <html lang="id" className={`${beVietnamPro.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface antialiased">
        <LanguageProvider>
          {isLoggedIn ? (
            <SidebarProvider>
              <AppSidebarWrapper
                name={user!.name}
                image={user!.image ?? null}
                tier={user!.tier ?? null}
                role={user!.role ?? null}
              >
                {children}
              </AppSidebarWrapper>
            </SidebarProvider>
          ) : (
            <>
              {children}
            </>
          )}
        </LanguageProvider>
      </body>
    </html>
  );
}

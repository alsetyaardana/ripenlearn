// app/page.tsx
// Landing page — mengikuti referensi yang sudah direview di stitch/landing_page_ripen/
// (hero-pattern, growth cycle bento grid). Link CTA beda tergantung status login:
// belum login -> halaman /login; sudah login -> /dashboard.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LandingHeader from "@/components/landing-header";

export const metadata: Metadata = {
  title: "Ripen — Belajar Kosakata Mandarin dengan Spaced Repetition",
  description:
    "Belajar kosakata Mandarin dengan spaced repetition berbasis kurikulum resmi HSK 3.0. Simulasi ujian, chat AI, dan latihan membaca dengan vocab yang sudah kamu kuasai.",
  keywords: [
    "belajar mandarin",
    "kosakata mandarin",
    "HSK 3.0",
    "spaced repetition",
    "simulasi ujian HSK",
    "kosakata mandarin sehari-hari",
  ],
  openGraph: {
    title: "Ripen — Belajar Kosakata Mandarin dengan Spaced Repetition",
    description:
      "Belajar kosakata Mandarin dengan spaced repetition berbasis kurikulum resmi HSK 3.0. Simulasi ujian, chat AI, dan latihan membaca dengan vocab yang sudah kamu kuasai.",
    url: "https://ripenlearn.web.id",
    siteName: "Ripen",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ripen — Belajar Kosakata Mandarin dengan Spaced Repetition",
    description:
      "Belajar kosakata Mandarin dengan spaced repetition berbasis kurikulum resmi HSK 3.0. Simulasi ujian, chat AI, dan latihan membaca dengan vocab yang sudah kamu kuasai.",
  },
};

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const authed = Boolean(session?.user);

  return (
    <main className="min-h-screen bg-background text-on-surface font-body-md antialiased">
      <LandingHeader authed={authed} />

      {/* Hero */}
      <section className="relative pt-24 pb-32 px-lg overflow-hidden hero-pattern">
        <div className="max-w-container-max mx-auto flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-xs px-sm py-xs rounded-full bg-surface-container-high border border-unripe-pale mb-lg">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>
              eco
            </span>
            <span className="font-label-caps text-label-caps text-primary">Grow your mastery</span>
          </div>
          <h1 className="font-display-lg text-[28px] sm:text-[36px] md:text-[48px] text-primary max-w-3xl mb-lg leading-tight">
            Belajar kosakata, lalu <br />
            <span className="text-secondary italic font-serif">benar-benar</span> gunakan untuk bicara.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-xl">
            Dari vocab baru yang &quot;mentah&quot; sampai matang benar-benar — pakai spaced repetition
            berbasis kurikulum resmi HSK 3.0, lalu latih aktif lewat chat, baca, dan simulasi
            ujian yang hanya memakai kata yang sudah kamu kuasai.
          </p>
          <div className="flex flex-col sm:flex-row gap-md">
            <Link
              href={authed ? "/dashboard" : "/login"}
              className="bg-primary text-on-primary font-body-md font-semibold px-xl py-md rounded-lg shadow-[0_8px_24px_-8px_rgba(22,52,34,0.4)] hover:translate-y-[-2px] transition-all flex items-center justify-center gap-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {authed ? "arrow_forward" : "login"}
              </span>
              {authed ? "Lanjut Belajar" : "Mulai Belajar"}
            </Link>
          </div>
        </div>
        {/* Decorative */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-secondary-fixed-dim/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-10 w-96 h-96 bg-primary-fixed-dim/20 rounded-full blur-3xl" />
      </section>

      {/* Growth cycle */}
      <section id="growth-cycle" className="py-24 px-lg bg-surface-container-low">
        <div className="max-w-container-max mx-auto">
          <div className="text-center mb-xl">
            <h2 className="font-headline-md text-headline-md text-primary mb-sm">The Growth Cycle</h2>
            <p className="text-on-surface-variant font-body-md max-w-2xl mx-auto">
              Dari benih sampai matang, metode kami meniru pertumbuhan organik.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {/* Step 1 */}
            <div className="bg-surface rounded-xl p-lg border border-unripe-pale relative overflow-hidden">
              <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mb-lg border border-outline-variant">
                <span className="material-symbols-outlined text-outline">eco</span>
              </div>
              <h3 className="font-headline-md text-lg text-primary mb-sm">1. Plant &amp; Review</h3>
              <p className="text-on-surface-variant text-sm mb-lg">
                Temui kosakata baru. Kami memakai spaced repetition yang teruji untuk memastikan
                kata itu benar-benar tertanam di ingatanmu.
              </p>
              <div className="h-32 bg-surface-container-lowest rounded-lg border border-unripe-pale p-md relative">
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="font-headline-hanzi text-headline-hanzi text-primary">猫</span>
                  <span className="font-pinyin-ruby text-pinyin-ruby text-on-surface-variant">māo</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-surface rounded-xl p-lg border border-unripe-pale relative overflow-hidden">
              <div className="w-12 h-12 bg-secondary-container rounded-full flex items-center justify-center mb-lg border border-secondary-fixed-dim">
                <span className="material-symbols-outlined text-on-secondary-container">psychology</span>
              </div>
              <h3 className="font-headline-md text-lg text-primary mb-sm">2. Mature &amp; Ripen</h3>
              <p className="text-on-surface-variant text-sm mb-lg">
                Sambil terus direview, kata berpindah dari &quot;benih&quot; yang rapuh menjadi vocab
                &quot;matang&quot; yang siap dipakai di dunia nyata.
              </p>
              <div className="h-32 bg-surface-container-lowest rounded-lg border border-unripe-pale p-md flex flex-col justify-end gap-sm">
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-3/4 rounded-full" />
                </div>
                <div className="flex justify-between font-label-caps text-[10px] text-outline">
                  <span>SEED</span>
                  <span>RIPE</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-primary-container rounded-xl p-lg border border-primary relative overflow-hidden">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-lg border border-primary-fixed-dim/30">
                <span className="material-symbols-outlined text-on-primary">forum</span>
              </div>
              <h3 className="font-headline-md text-lg text-on-primary mb-sm">3. Use &amp; Chat</h3>
              <p className="text-on-primary-container text-sm mb-lg">
                Jangan cuma menghafal. Ngobrol dengan AI yang konsisten memakai vocab yang sudah
                kamu kuasai, supaya aktif dipakai.
              </p>
              <div className="h-32 bg-primary/50 rounded-lg p-sm flex flex-col gap-sm overflow-hidden border border-primary-fixed-dim/20">
                <div className="bg-surface-container text-on-surface text-xs p-sm rounded-lg rounded-tl-none self-start max-w-[80%]">
                  你喜欢猫吗？
                </div>
                <div className="bg-secondary text-on-secondary text-xs p-sm rounded-lg rounded-tr-none self-end max-w-[80%] border border-secondary-fixed-dim/30">
                  我很喜欢猫。
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-highest w-full py-md px-lg flex flex-col items-center gap-sm">
        <nav className="flex items-center gap-md">
          <Link href="/login" className="text-sm text-on-tertiary-fixed-variant hover:text-primary transition-opacity duration-300">
            Masuk
          </Link>
          <span className="text-on-surface-variant">·</span>
          <Link href="/dashboard" className="text-sm text-on-tertiary-fixed-variant hover:text-primary transition-opacity duration-300">
            Aplikasi
          </Link>
          <span className="text-on-surface-variant">·</span>
          <Link href="/privacy" className="text-sm text-on-tertiary-fixed-variant hover:text-primary transition-opacity duration-300">
            Privasi
          </Link>
          <span className="text-on-surface-variant">·</span>
          <Link href="/harga" className="text-sm text-on-tertiary-fixed-variant hover:text-primary transition-opacity duration-300">
            Harga
          </Link>
        </nav>
        <div className="text-sm text-on-surface-variant">&copy; 2024 Ripen Mandarin. Grow your mastery.</div>
      </footer>
    </main>
  );
}

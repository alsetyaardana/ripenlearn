// app/tentang/page.tsx
// Halaman Tentang — filosofi, siapa di balik Ripen, kontak untuk diskusi.
// Server component, Bahasa Indonesia.
import { auth } from "@/lib/auth";
import LandingHeader from "@/components/landing-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tentang — Ripen",
  description:
    "Kenapa Ripen dibuat, siapa di baliknya, dan cara berdiskusi tentang proyek ini.",
};

export default async function TentangPage() {
  const session = await auth();
  const authed = Boolean(session?.user);

  return (
    <main className="min-h-screen bg-background text-on-surface font-body-md antialiased">
      <LandingHeader authed={authed} />
      <div className="max-w-container-max mx-auto px-lg py-xl">
        <header className="mb-xl">
          <h1 className="font-display-lg text-display-lg text-primary mb-sm">Tentang Ripen</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Ripen adalah proyek pribadi, bukan startup. Halaman ini menjelaskan
            dari mana proyek ini berasal, dan ke mana ia ingin pergi.
          </p>
        </header>

        {/* Kenapa Ripen Dibuat */}
        <section id="kenapa-ripen-dibuat" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Kenapa Ripen Dibuat</h2>
          <div className="space-y-md max-w-3xl">
            <p className="font-body-md text-body-md text-on-surface leading-relaxed">
              Saya belajar Mandarin selama beberapa tahun, dan saya menemukan pola yang
              sama berulang: saya menghafal kata-kata baru, saya bisa mengerjakan kartu
              di Anki dengan skor bagus, tapi begitu saya harus berbicara atau membaca
              teks asli, kosakata itu seperti hilang. Ternyata, menghafal dan
              menguasai itu dua kemampuan berbeda.
            </p>
            <p className="font-body-md text-body-md text-on-surface leading-relaxed">
              Masalahnya bukan pada metode SRS — spaced repetition itu sudah terbukti
              efektif secara empiris. Masalahnya ada di gap antara fase hafalan dan fase
              penggunaan. Anki hebat untuk membuatmu menghafal, tapi ia berhenti di situ.
              HelloTalk bagus untuk percakapan, tapi ia tidak peduli apakah kamu sudah
              siap atau belum. Tidak ada yang menjembatani kedua fase ini dengan serius.
            </p>
            <p className="font-body-md text-body-md text-on-surface leading-relaxed">
              Ripen dibuat untuk menjembatani gap itu. Filosofinya sederhana: buat
              kosakatamu matang dulu, baru gunakan. Kedengarannya lambat — dan memang
              lebih lambat di minggu-minggu awal. Tapi hasilnya terasa: percakapan yang
              terasa natural, bacaan yang bisa kamu pahami, dan ujian yang tidak terasa
              seperti tebakan kosong.
            </p>
            <p className="font-body-md text-body-md text-on-surface leading-relaxed">
              Satu hal lagi: saya percaya kurikulum yang berbasis standar resmi (HSK 3.0)
              lebih adil dari kurikulum yang berbasis perasaan. Dengan kurikulum resmi,
              setidaknya ada titik acuan yang jelas. Dengan "belajar bebas", kamu tidak
              pernah tahu apakah kamu sudah cukup atau belum.
            </p>
          </div>
        </section>

        {/* Siapa di Balik Ini */}
        <section id="siapa-di-balik-ini" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Siapa di Balik Ini</h2>
          <div className="bg-surface rounded-xl p-lg border border-unripe-pale max-w-3xl">
            <div className="flex flex-col sm:flex-row gap-md">
              <div className="w-16 h-16 rounded-full bg-primary-container border border-primary flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-on-primary-container" style={{ fontSize: 28 }}>person</span>
              </div>
              <div>
                <h3 className="font-headline-md text-lg text-primary mb-xs">Alindra Setya Ardana</h3>
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-sm">Pembuat Ripen</p>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  Pengembang perangkat lunak yang tertarik dengan bagaimana teknologi
                  bisa membantu belajar bahasa secara lebih jujur — tanpa janji
                  "10 menit sehari langsung bisa", tapi dengan pendekatan yang
                  bisa diukur hasilnya. Mandarin bukan bahasa pertama saya, dan
                  Ripen lahir dari frustrasi pribadi yang saya alami sebagai
                  pembelajar bahasa kedua.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Diskusi & Kritik */}
        <section id="diskusi-kritik" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Diskusi &amp; Kritik</h2>
          <div className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale max-w-3xl">
            <div className="flex items-center gap-sm mb-sm">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>chat</span>
              <h3 className="font-headline-md text-lg text-primary">Saya Ingin Berdiskusi</h3>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-sm">
              Ripen bukan produk komersial — ini proyek eksperimen yang masih berkembang.
              Saya terbuka untuk kritik, saran, atau sekadar diskusi tentang metode
              belajar bahasa.
            </p>
            <ul className="list-disc pl-lg space-y-xs text-on-surface-variant text-sm leading-relaxed">
              <li>
                Punya saran fitur atau kritik tentang metode? Buka issue di repository.
              </li>
              <li>
                Menemukan bug atau perilaku aneh? Issue juga — lebih baik daripada
                diam.
              </li>
              <li>
                Punya pandangan berbeda tentang pendekatan belajar? Diskusi terbuka
                selalu lebih baik dari asumsi diam-diam.
              </li>
            </ul>
            <p className="text-on-surface-variant text-sm leading-relaxed mt-sm">
              Tidak ada sales pitch di sini. Jika Ripen bermanfaat untukmu, itu sudah
              cukup. Jika tidak, beritahu saya kenapa — itu lebih berharga.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

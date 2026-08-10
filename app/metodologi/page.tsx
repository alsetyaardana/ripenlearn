// app/metodologi/page.tsx
// Halaman Metodologi — Growth Cycle, gating vocab, positioning vs Anki/HelloTalk.
// Server component, string Bahasa Indonesia (i18n menyusul).
import { auth } from "@/lib/auth";
import LandingHeader from "@/components/landing-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metodologi — Ripen",
  description:
    "Growth Cycle Ripen: Plant & Review, Mature & Ripen, Use & Chat. Kenapa kosakata digating, dan apa bedanya dengan Anki atau HelloTalk.",
};

export default async function MetodologiPage() {
  const session = await auth();
  const authed = Boolean(session?.user);

  return (
    <main className="min-h-screen bg-background text-on-surface font-body-md antialiased">
      <LandingHeader authed={authed} />
      <div className="max-w-container-max mx-auto px-lg py-xl">
        <header className="mb-xl">
          <h1 className="font-display-lg text-display-lg text-primary mb-sm">Metodologi</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Ripen dibangun di atas satu premis: kosakata yang baru dihafal dan kosakata
            yang benar-benar dikuasai adalah dua hal berbeda. Semua fitur di Ripen
            mengikuti premis ini — dari jadwal review sampai batasan yang dipaksakan ke AI.
          </p>
        </header>

        {/* Growth Cycle */}
        <section id="growth-cycle" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Growth Cycle</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <div className="bg-surface rounded-xl p-lg border border-unripe-pale">
              <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mb-lg border border-outline-variant">
                <span className="material-symbols-outlined text-outline" style={{ fontSize: 20 }}>eco</span>
              </div>
              <h3 className="font-headline-md text-lg text-primary mb-sm">1. Plant &amp; Review</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Kosakata baru masuk sebagai "benih" dan direview dengan spaced repetition
                (algoritma FSRS). Jadwal review dihitung dari kondisi ingatanmu, bukan
                dari kalender yang kaku. Tujuannya satu: memindahkan kata dari ingatan
                jangka pendek ke jangka panjang secara terukur.
              </p>
            </div>
            <div className="bg-surface rounded-xl p-lg border border-unripe-pale">
              <div className="w-12 h-12 bg-secondary-container rounded-full flex items-center justify-center mb-lg border border-secondary-fixed-dim">
                <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: 20 }}>psychology</span>
              </div>
              <h3 className="font-headline-md text-lg text-primary mb-sm">2. Mature &amp; Ripen</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Satu kata dianggap "matang" (mastered) saat stabilitas FSRS-nya melewati
                ambang batas — bukan sekadar pernah dilihat beberapa kali. Ambang ini
                adalah syarat mutlak: hanya kata yang sudah matang yang boleh dipakai
                fitur AI. Kata yang masih mentah tidak bocor ke mana-mana.
              </p>
            </div>
            <div className="bg-primary-container rounded-xl p-lg border border-primary">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-lg border border-primary-fixed-dim/30">
                <span className="material-symbols-outlined text-on-primary" style={{ fontSize: 20 }}>forum</span>
              </div>
              <h3 className="font-headline-md text-lg text-on-primary mb-sm">3. Use &amp; Chat</h3>
              <p className="text-on-primary-container text-sm leading-relaxed">
                Setelah matang, kata "dipetik" dan dipakai di dunia nyata: ngobrol dengan
                AI, baca artikel, dan simulasi ujian — semuanya dibatasi pada kosakata
                yang sudah kamu kuasai. Ini penerapan comprehensible input: input yang
                bisa kamu pahami karena ~95%-nya sudah kamu kenal (i+1, Krashen).
              </p>
            </div>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-md max-w-3xl">
            Fase 1 dan 2 membangun fondasi; fase 3 yang membuat bahasa itu hidup. Tanpa
            fase 3, hafalan berhenti di tes kartu. Tanpa fase 1 dan 2, percakapan
            berhenti di kosakata yang belum kamu punya.
          </p>
        </section>

        {/* Kenapa Gating Vocab */}
        <section id="kenapa-gating-vocab" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Kenapa Gating Vocab</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mb-sm">
            Gating vocab sering terdengar seperti pembatasan — seolah-olah kami sengaja
            membuat chat AI-nya "dumb". Justru sebaliknya: ini prinsip akuisisi bahasa,
            bukan batasan UX.
          </p>
          <ul className="list-disc pl-lg space-y-sm font-body-md text-body-md text-on-surface max-w-3xl">
            <li>
              <strong>Input di atas levelmu tidak bisa dipahami, dan yang tidak bisa
              dipahami tidak bisa dipelajari.</strong> Kalau AI bebas memakai kosakata
              level 6 saat kamu baru di level 1, kamu tidak sedang belajar — kamu sedang
              membaca teka-teki.
            </li>
            <li>
              <strong>i+1, bukan i+500.</strong> Input yang efektif berada sedikit di atas
              level saat ini: satu struktur atau beberapa kata baru di tengah materi yang
              sudah dikenal. Gating memastikan AI tidak pernah melompat terlalu jauh.
            </li>
            <li>
              <strong>Mengaktifkan vocab itu kerja yang berbeda dari mengenalinya.</strong>
              Menemukan kata di dalam kalimat (recognition) jauh lebih mudah daripada
              memproduksinya saat bicara (production). Dengan memaksa AI memakai
              kosakatamu, kamu berlatih production di zona yang masih nyaman.
            </li>
            <li>
              <strong>Umpan balik yang jujur.</strong> Kalau chat terasa sempit, itu
              informasi: kosakata aktifmu memang masih sempit. Kalau terasa luas, itu
              juga informasi: kamu sudah siap naik level. Gating membuat progress terasa,
              bukan cuma terlihat di grafik.
            </li>
          </ul>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mt-sm">
            Gating bukan hukuman — gating adalah kurikulum yang berjalan sendiri.
          </p>
        </section>

        {/* Apa Bedanya dari Anki/HelloTalk */}
        <section id="apa-bedanya-dari-anki-hellotalk" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Apa Bedanya dari Anki/HelloTalk</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-body-md text-body-md">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="py-sm pr-md font-label-caps text-label-caps text-on-surface-variant">Aspek</th>
                  <th className="py-sm pr-md font-label-caps text-label-caps text-on-surface-variant">Anki</th>
                  <th className="py-sm pr-md font-label-caps text-label-caps text-on-surface-variant">HelloTalk</th>
                  <th className="py-sm font-label-caps text-label-caps text-primary">Ripen</th>
                </tr>
              </thead>
              <tbody className="text-on-surface">
                <tr className="border-b border-unripe-pale align-top">
                  <td className="py-sm pr-md">Fokus</td>
                  <td className="py-sm pr-md text-on-surface-variant">Hafalan murni (SRS)</td>
                  <td className="py-sm pr-md text-on-surface-variant">Percakapan dengan penutur asli</td>
                  <td className="py-sm text-primary font-semibold">Hafalan → penggunaan aktif, dalam satu loop</td>
                </tr>
                <tr className="border-b border-unripe-pale align-top">
                  <td className="py-sm pr-md">Kurikulum</td>
                  <td className="py-sm pr-md text-on-surface-variant">Deck buatan sendiri, kualitas tak merata</td>
                  <td className="py-sm pr-md text-on-surface-variant">Tidak ada — bebas ngobrol apa saja</td>
                  <td className="py-sm text-primary font-semibold">HSK 3.0 resmi, terstruktur per level</td>
                </tr>
                <tr className="border-b border-unripe-pale align-top">
                  <td className="py-sm pr-md">Kosakata di percakapan</td>
                  <td className="py-sm pr-md text-on-surface-variant">Tidak ada percakapan</td>
                  <td className="py-sm pr-md text-on-surface-variant">Acak — lawan bicara pakai kata yang belum kamu tahu</td>
                  <td className="py-sm text-primary font-semibold">Dibatasi pada vocab yang sudah kamu kuasai (i+1)</td>
                </tr>
                <tr className="align-top">
                  <td className="py-sm pr-md">Umpan balik</td>
                  <td className="py-sm pr-md text-on-surface-variant">Benar/salah di kartu</td>
                  <td className="py-sm pr-md text-on-surface-variant">Koreksi manual dari orang lain</td>
                  <td className="py-sm text-primary font-semibold">Latihan terukur + simulasi ujian dengan kosakata levelmu</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mt-md">
            Anki hebat untuk fase 1–2, HelloTalk hebat untuk fase 3. Ripen mencoba
            menjembatani keduanya: SRS yang terukur dari Anki, penggunaan aktif dari
            percakapan — tanpa membiarkan salah satunya menenggelamkan yang lain.
          </p>
        </section>
      </div>
    </main>
  );
}

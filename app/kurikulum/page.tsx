// app/kurikulum/page.tsx
// Halaman Kurikulum — standar HSK 3.0, perbandingan dengan HSK lama, breakdown level,
// dan disclosure adaptasi. Server component, Bahasa Indonesia.
import { auth } from "@/lib/auth";
import LandingHeader from "@/components/landing-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kurikulum — Ripen",
  description:
    "Kurikulum Ripen berbasis HSK 3.0 resmi (CLEC). Breakdown kosakata per level dan penyesuaian yang kami lakukan.",
};

// Jumlah kosakata per level dari database (diambil dari data HSK 3.0 yang diimpor).
const LEVELS = [
  { level: 1, vocab: 300, target: "Kata sehari-hari paling dasar; bisa menyapa, memperkenalkan diri, dan bertanya sederhana." },
  { level: 2, vocab: 198, target: "Melengkapi level 1 dengan kata tugas; percakapan rutin yang lebih natural." },
  { level: 3, vocab: 499, target: "Topik kehidupan sehari-hari lebih luas: belanja, makan, transportasi, waktu." },
  { level: 4, vocab: 997, target: "Menceritakan pengalaman dan rencana; memahami teks pendek sederhana." },
  { level: 5, vocab: 1595, target: "Diskusi topik umum dan berita sederhana; membaca artikel pendek." },
  { level: 6, vocab: 1785, target: "Argumen dan opini; memahami teks yang lebih panjang dan beragam." },
  { level: 7, vocab: 5585, target: "Penggunaan akademik dan profesional; teks kompleks, bahasa formal." },
];

export default async function KurikulumPage() {
  const session = await auth();
  const authed = Boolean(session?.user);

  return (
    <main className="min-h-screen bg-background text-on-surface font-body-md antialiased">
      <LandingHeader authed={authed} />
      <div className="max-w-container-max mx-auto px-lg py-xl">
        <header className="mb-xl">
          <h1 className="font-display-lg text-display-lg text-primary mb-sm">Kurikulum</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Semua kosakata di Ripen mengacu pada HSK 3.0 — standar resmi ujian bahasa
            Mandarin yang diterbitkan oleh Center for Language Education and Cooperation
            (CLEC), berlaku efektif Juli 2026. Kami tidak membuat daftar kata sendiri;
            kami mengikuti standar, lalu menyesuaikan cara kerjanya untuk belajar.
          </p>
        </header>

        {/* Standar Resmi */}
        <section id="standar-resmi" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Standar Resmi</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mb-sm">
            HSK 3.0 (新版HSK考试大纲) adalah penyempurnaan besar dari HSK lama. Perubahan
            utamanya:
          </p>
          <ul className="list-disc pl-lg space-y-sm font-body-md text-body-md text-on-surface max-w-3xl">
            <li>
              <strong>Tujuh level (1–7)</strong> menggantikan enam level (1–6) — level 7–9
              untuk penggunaan akademik/profesional, dengan level 7 sebagai jembatan.
            </li>
            <li>
              <strong>Lima komponen kurikulum</strong>, bukan sekadar daftar kata: task
              (tugas komunikasi), topic (topik), vocabulary (kosakata), character (汉字),
              dan grammar (tata bahasa).
            </li>
            <li>
              <strong>Penekanan pada kompetensi nyata</strong>: apa yang bisa kamu lakukan
              dengan bahasa itu (berbicara, membaca, menulis), bukan hanya berapa kata
              yang kamu hafal.
            </li>
          </ul>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mt-sm">
            Ripen memakai vocab dan struktur level dari dokumen ini sebagai tulang
            punggung kurikulum — sumber resmi, bukan daftar kata dari internet.
          </p>
        </section>

        {/* HSK 3 vs HSK Lama */}
        <section id="hsk3-vs-hsk-lama" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">HSK 3 vs HSK Lama</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-body-md text-body-md">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="py-sm pr-md font-label-caps text-label-caps text-on-surface-variant">Aspek</th>
                  <th className="py-sm pr-md font-label-caps text-label-caps text-on-surface-variant">HSK Lama (1–6)</th>
                  <th className="py-sm font-label-caps text-label-caps text-primary">HSK 3.0 (1–9)</th>
                </tr>
              </thead>
              <tbody className="text-on-surface">
                <tr className="border-b border-unripe-pale align-top">
                  <td className="py-sm pr-md">Level</td>
                  <td className="py-sm pr-md text-on-surface-variant">6 level</td>
                  <td className="py-sm text-primary font-semibold">9 level; 7–9 untuk akademik/profesional</td>
                </tr>
                <tr className="border-b border-unripe-pale align-top">
                  <td className="py-sm pr-md">Fokus</td>
                  <td className="py-sm pr-md text-on-surface-variant">Jumlah kosakata per level</td>
                  <td className="py-sm text-primary font-semibold">Kompetensi komunikasi (task &amp; topic)</td>
                </tr>
                <tr className="border-b border-unripe-pale align-top">
                  <td className="py-sm pr-md">Kosakata</td>
                  <td className="py-sm pr-md text-on-surface-variant">±5.000 kata total, distribusi miring ke level atas</td>
                  <td className="py-sm text-primary font-semibold">±11.092 kata total, distribusi lebih merata di level bawah</td>
                </tr>
                <tr className="align-top">
                  <td className="py-sm pr-md">Implikasi belajar</td>
                  <td className="py-sm pr-md text-on-surface-variant">Level 1–2 terlalu kecil untuk percakapan nyata</td>
                  <td className="py-sm text-primary font-semibold">Level bawah lebih padat — percakapan nyata bisa dimulai lebih awal</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mt-md">
            Karena level bawah HSK 3.0 jauh lebih kaya, gating vocab Ripen jadi terasa
            masuk akal sejak level 1: dengan ±300 kata pun, chat AI sudah bisa berjalan
            dalam zona yang bisa kamu pahami.
          </p>
        </section>

        {/* Breakdown Level */}
        <section id="breakdown-level" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Breakdown Level</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mb-md">
            Jumlah kosakata per level di bawah diambil langsung dari database Ripen
            (hasil impor dokumen HSK 3.0 resmi). Perhatikan bahwa level tidak linear —
            lompatan terbesar ada di level 7, karena level itu menjadi pintu masuk
            penggunaan akademik.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-body-md text-body-md">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="py-sm pr-md font-label-caps text-label-caps text-on-surface-variant">Level</th>
                  <th className="py-sm pr-md font-label-caps text-label-caps text-on-surface-variant">Kosakata</th>
                  <th className="py-sm font-label-caps text-label-caps text-on-surface-variant">Target Skill</th>
                </tr>
              </thead>
              <tbody className="text-on-surface">
                {LEVELS.map((row) => (
                  <tr key={row.level} className="border-b border-unripe-pale align-top">
                    <td className="py-sm pr-md font-semibold text-primary">Level {row.level}</td>
                    <td className="py-sm pr-md tabular-nums">{row.vocab.toLocaleString("id-ID")}</td>
                    <td className="py-sm text-on-surface-variant">{row.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Adaptasi & Gap Disclosure */}
        <section id="adaptasi-gap-disclosure" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Adaptasi &amp; Gap Disclosure</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mb-sm">
            Kurikulum resmi kami jadikan sumber, tapi kami tidak mengklaim Ripen
            menggantikan ujian resmi. Hal yang kami sesuaikan:
          </p>
          <ul className="list-disc pl-lg space-y-sm font-body-md text-body-md text-on-surface max-w-3xl">
            <li>
              <strong>Prioritas vocab di fase awal.</strong> Dokumen resmi memuat lima
              komponen (task, topic, vocab, character, grammar). Ripen memulai dari vocab
              dan character; task, topic, dan grammar digunakan sebagai penanda level dan
              konteks, belum sebagai materi tersendiri.
            </li>
            <li>
              <strong>Simulasi ujian, bukan ujian resmi.</strong> Format soal kami tiru
              dari struktur HSK 3.0, tapi soal dibuat oleh AI dan disesuaikan dengan
              kosakata yang sudah kamu kuasai — bukan soal resmi, dan bukan penentu
              sertifikasi apa pun.
            </li>
            <li>
              <strong>Kata dengan notasi level tambahan.</strong> Beberapa kata dalam
              dokumen resmi punya catatan level ekstra (misal "3（4）" — utamanya level 3,
              ada makna tambahan di level 4). Ripen menyimpan catatan ini dan menampilkan
              makna sesuai konteks level yang sedang kamu pelajari.
            </li>
            <li>
              <strong>Jumlah kosakata bisa berbeda tipis dari dokumen cetak.</strong>
              Kami mengimpor dari sumber resmi, tapi klasifikasi beberapa kata bisa
              direvisi bila ada koreksi data. Angka di halaman ini selalu mengikuti isi
              database, bukan sebaliknya.
            </li>
          </ul>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mt-sm">
            Ringkasnya: standar resmi menentukan <em>apa</em> yang kamu pelajari; Ripen
            menentukan <em>bagaimana</em> kamu mempelajarinya.
          </p>
        </section>
      </div>
    </main>
  );
}

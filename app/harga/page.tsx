// app/harga/page.tsx
// Halaman Harga — 3 tier (Free/Premium/Unlimited) dengan detail fitur dan kuota.
// Server component, Bahasa Indonesia.
import { auth } from "@/lib/auth";
import LandingHeader from "@/components/landing-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Harga — Ripen",
  description:
    "Tiga tier Ripen: Free, Premium, dan Unlimited. Bandingkan kuota Plant & Review, Chat, Reading, Shadowing, dan Exam.",
};

interface TierFeature {
  name: string;
  free: string;
  premium: string;
  unlimited: string;
  note?: string;
}

const FEATURES: TierFeature[] = [
  {
    name: "Plant & Review",
    free: "10 kartu baru/hari · Recognition + Cloze",
    premium: "30 kartu baru/hari · Recognition + Cloze + Production",
    unlimited: "50 kartu baru/hari · Recognition + Cloze + Production",
    note: "Production (mengetik karakter dari pinyin/definisi) hanya tersedia di Premium ke atas karena butuh AI grading.",
  },
  {
    name: "Chat",
    free: "20 pesan/hari",
    premium: "200 pesan/hari",
    unlimited: "Tidak terbatas",
  },
  {
    name: "Reading",
    free: "5 artikel/hari",
    premium: "50 artikel/hari",
    unlimited: "Tidak terbatas",
  },
  {
    name: "Shadowing",
    free: "Sesi terbatas",
    premium: "Sesi penuh",
    unlimited: "Tidak terbatas",
  },
  {
    name: "Exam",
    free: "5 soal/bulan",
    premium: "50 soal/bulan",
    unlimited: "Tidak terbatas",
  },
  {
    name: "Call",
    free: "Coming soon",
    premium: "Coming soon",
    unlimited: "Coming soon",
  },
  {
    name: "Chunking",
    free: "Coming soon",
    premium: "Coming soon",
    unlimited: "Coming soon",
  },
];

export default async function HargaPage() {
  const session = await auth();
  const authed = Boolean(session?.user);

  return (
    <main className="min-h-screen bg-background text-on-surface font-body-md antialiased">
      <LandingHeader authed={authed} />
      <div className="max-w-container-max mx-auto px-lg py-xl">
        <header className="mb-xl">
          <h1 className="font-display-lg text-display-lg text-primary mb-sm">Harga</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Ripen tetap bisa digunakan gratis. Premium membuka fitur yang lebih dalam;
            Unlimited ada untuk yang butuh tanpa batas — tapi ini bukan produk jual.
          </p>
        </header>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-xl">
          {/* Free */}
          <div className="bg-surface rounded-xl p-lg border border-unripe-pale">
            <div className="mb-md">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Tier</span>
              <h2 className="font-headline-md text-headline-md text-primary">Free</h2>
              <p className="text-on-surface-variant text-sm mt-xs">Cukup untuk belajar rutin tanpa biaya.</p>
            </div>
            <ul className="space-y-sm text-sm text-on-surface-variant">
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>10 kartu baru/hari · Recognition + Cloze</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>20 pesan Chat/hari</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>5 artikel Reading/hari</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>Shadowing sesi terbatas</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>5 soal Exam/bulan</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-outline-variant mt-0.5" style={{ fontSize: 16 }}>schedule</span>
                <span className="text-outline">Call · Coming soon</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-outline-variant mt-0.5" style={{ fontSize: 16 }}>schedule</span>
                <span className="text-outline">Chunking · Coming soon</span>
              </li>
            </ul>
          </div>

          {/* Premium */}
          <div className="bg-surface rounded-xl p-lg border-2 border-primary relative">
            <div className="absolute -top-3 left-md bg-primary text-on-primary px-sm py-xs rounded-full font-label-caps text-label-caps">
              Populer
            </div>
            <div className="mb-md">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Tier</span>
              <h2 className="font-headline-md text-headline-md text-primary">Premium</h2>
              <p className="text-on-surface-variant text-sm mt-xs">Untuk yang belajar serius dan butuh Production.</p>
            </div>
            <ul className="space-y-sm text-sm text-on-surface-variant">
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>30 kartu baru/hari · Recognition + Cloze + <strong>Production</strong></span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>200 pesan Chat/hari</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>50 artikel Reading/hari</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>Shadowing sesi penuh</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>50 soal Exam/bulan</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-outline-variant mt-0.5" style={{ fontSize: 16 }}>schedule</span>
                <span className="text-outline">Call · Coming soon</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-outline-variant mt-0.5" style={{ fontSize: 16 }}>schedule</span>
                <span className="text-outline">Chunking · Coming soon</span>
              </li>
            </ul>
          </div>

          {/* Unlimited */}
          <div className="bg-surface rounded-xl p-lg border border-unripe-pale">
            <div className="mb-md">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Tier</span>
              <h2 className="font-headline-md text-headline-md text-primary">Unlimited</h2>
              <p className="text-on-surface-variant text-sm mt-xs">Tanpa batas kuota — untuk pemilik saja.</p>
            </div>
            <ul className="space-y-sm text-sm text-on-surface-variant">
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>50 kartu baru/hari · Recognition + Cloze + <strong>Production</strong></span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>Chat · Tidak terbatas</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>Reading · Tidak terbatas</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>Shadowing · Tidak terbatas</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                <span>Exam · Tidak terbatas</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-outline-variant mt-0.5" style={{ fontSize: 16 }}>schedule</span>
                <span className="text-outline">Call · Coming soon</span>
              </li>
              <li className="flex items-start gap-xs">
                <span className="material-symbols-outlined text-outline-variant mt-0.5" style={{ fontSize: 16 }}>schedule</span>
                <span className="text-outline">Chunking · Coming soon</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Detail comparison table */}
        <section id="perbandingan-detail" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Perbandingan Detail</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-body-md text-body-md">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="py-sm pr-md font-label-caps text-label-caps text-on-surface-variant">Fitur</th>
                  <th className="py-sm pr-md font-label-caps text-label-caps text-on-surface-variant">Free</th>
                  <th className="py-sm pr-md font-label-caps text-label-caps text-primary">Premium</th>
                  <th className="py-sm font-label-caps text-label-caps text-on-surface-variant">Unlimited</th>
                </tr>
              </thead>
              <tbody className="text-on-surface">
                {FEATURES.map((feat, i) => (
                  <tr key={i} className="border-b border-unripe-pale align-top">
                    <td className="py-sm pr-md font-semibold text-primary">{feat.name}</td>
                    <td className="py-sm pr-md text-sm text-on-surface-variant">{feat.free}</td>
                    <td className="py-sm pr-md text-sm">{feat.premium}</td>
                    <td className="py-sm text-sm text-on-surface-variant">{feat.unlimited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Penjelasan Production */}
        <section id="kenapa-production" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Kenapa Production Hanya untuk Premium ke Atas</h2>
          <div className="bg-surface rounded-xl p-lg border border-unripe-pale max-w-3xl">
            <div className="flex items-start gap-sm mb-sm">
              <span className="material-symbols-outlined text-secondary mt-0.5" style={{ fontSize: 20 }}>info</span>
              <h3 className="font-headline-md text-lg text-primary">Production = AI Grading = Biaya Tambahan</h3>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-sm">
              Fitur Production (mengetik karakter dari pinyin atau definisi) membutuhkan
              AI untuk menilai apakah jawabanmu benar — termasuk pengecekan nada,
              struktur karakter, dan alternatif yang bisa diterima. Setiap jawaban
              yang kamu kirim diproses oleh DeepSeek API, yang memiliki biaya per
              permintaan.
            </p>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-sm">
              Dua fitur lain — Recognition dan Cloze — tidak butuh AI grading: jawaban
              diketahui dari awal (kartu langsung menunjukkan jawabannya). Karena itu,
              Production harus dibatasi secara kuota, sementara dua fitur lain tidak.
            </p>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Ini bukan strategi pricing untuk memaksa upgrade — ini biaya nyata yang
              harus dikelola agar Ripen bisa berjalan untuk semua orang.
            </p>
          </div>
        </section>

        {/* Catatan Unlimited */}
        <section id="catatan-unlimited" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Catatan Tentang Unlimited</h2>
          <div className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale max-w-3xl">
            <p className="text-on-surface-variant text-sm leading-relaxed mb-sm">
              Tier Unlimited <strong>bukan produk yang dijual</strong>. Tier ini hanya
              bisa didapatkan lewat penyesuaian manual di database oleh pemilik
              aplikasi — misal untuk akun sendiri atau orang yang sedang diajari langsung.
            </p>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Semua pemakaian tetap dicatat (untuk monitoring biaya AI), tapi kuota
              tidak pernah memblokir. Jika kamu melihat tier Unlimited di akunmu, itu
              berarti pemilik aplikasi memberimu akses penuh — bukan sesuatu yang bisa
              kamu beli atau klaim sendiri.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

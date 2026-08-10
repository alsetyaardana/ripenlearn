// app/privacy/page.tsx
// Halaman Kebijakan Privasi — format user-facing, Bahasa Indonesia.
// Disediakan oleh pemilik server; pengguna tinggal baca dan gunakan.
import { auth } from "@/lib/auth";
import LandingHeader from "@/components/landing-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — Ripen",
  description:
    "Pelajari bagaimana Ripen melindungi data pribadimu saat belajar bahasa Mandarin.",
};

export default async function PrivacyPage() {
  const session = await auth();
  const authed = Boolean(session?.user);

  return (
    <main className="min-h-screen bg-surface">
      <LandingHeader authed={authed} />
      {/* Hero header */}
      <div className="bg-primary text-on-primary py-lg px-sm md:px-lg">
        <div className="max-w-[680px] mx-auto">
          <h1 className="font-headline-xl text-headline-xl mt-sm">
            Kebijakan Privasi
          </h1>
          <p className="font-body-md text-body-md text-on-primary/80 mt-xs">
            Terakhir diperbarui: 3 Agustus 2026
          </p>
        </div>
      </div>

      {/* Konten */}
      <div className="max-w-[680px] mx-auto px-sm md:px-lg py-xl text-on-surface">
        <section className="mb-xl">
          <h2 className="font-headline-sm text-headline-sm mb-sm">Pengantar</h2>
          <p className="font-body-md text-body-md leading-relaxed mb-sm">
            Kebijakan privasi ini menjelaskan bagaimana Ripen mengumpulkan,
            menggunakan, dan melindungi data pribadimu. Ripen adalah aplikasi
            belajar bahasa Mandarin berbasis spaced repetition yang berjalan di
            server pribadi.
          </p>
          <p className="font-body-md text-body-md leading-relaxed">
            Dengan menggunakan Ripen, kamu dianggap telah membaca dan memahami
            kebijakan privasi ini.
          </p>
        </section>

        <section className="mb-xl">
          <h2 className="font-headline-sm text-headline-sm mb-sm">
            Data yang Kami Kumpulkan
          </h2>
          <p className="font-body-md text-body-md leading-relaxed mb-sm">
            Kami hanya mengumpulkan data yang diperlukan agar aplikasi berfungsi
            dengan baik:
          </p>
          <ul className="list-disc pl-lg space-y-sm font-body-md text-body-md leading-relaxed">
            <li>
              <strong>Nama dan alamat email</strong> — diambil dari akun Google
              saat kamu masuk. Kami tidak pernah menerima atau menyimpan kata
              sandimu.
            </li>
            <li>
              <strong>Progress belajar</strong> — riwayat review kartu kosakata,
              jadwal spaced repetition, dan tingkat penguasaanmu.
            </li>
            <li>
              <strong>Percakapan dengan AI</strong> — isi chat, latihan membaca,
              dan jawaban simulasi ujian yang kamu kirim, beserta tanggapan yang
              dihasilkan.
            </li>
          </ul>
        </section>

        <section className="mb-xl">
          <h2 className="font-headline-sm text-headline-sm mb-sm">
            Bagaimana Kami Menggunakan Data
          </h2>
          <ul className="list-disc pl-lg space-y-sm font-body-md text-body-md leading-relaxed">
            <li>
              Mengidentifikasi akunmu dan menyediakan akses ke aplikasi.
            </li>
            <li>
              Menghitung jadwal review dan menentukan kosakata yang sudah kamu
              kuasai.
            </li>
            <li>
              Mengirim percakapanmu ke layanan AI supaya bisa merespons sesuai
              kosakata yang sudah kamu kuasai.
            </li>
          </ul>
        </section>

        <section className="mb-xl">
          <h2 className="font-headline-sm text-headline-sm mb-sm">
            Penggunaan Layanan AI
          </h2>
          <p className="font-body-md text-body-md leading-relaxed mb-sm">
            Fitur AI dalam Ripen (chat, latihan membaca, simulasi ujian) mengirim
            percakapanmu ke DeepSeek API, sebuah layanan bahasa dari pihak
            ketiga, untuk menghasilkan respons.
          </p>
          <p className="font-body-md text-body-md leading-relaxed">
            Sebelum dikirim, kosakata yang boleh dipakai AI dibatasi hanya pada
            kata yang sudah kamu kuasai. Data yang dikirim adalah percakapanmu
            beserta daftar kosakata yang diizinkan — kami tidak mengirim data
            pengguna lain.
          </p>
        </section>

        <section className="mb-xl">
          <h2 className="font-headline-sm text-headline-sm mb-sm">
            Penyimpanan dan Keamanan
          </h2>
          <p className="font-body-md text-body-md leading-relaxed">
            Data belajarmu disimpan di database server yang menghosting aplikasi
            ini. Koneksi ke aplikasi menggunakan enkripsi HTTPS. Kami tidak
            menggunakan layanan penyimpanan cloud pihak ketiga untuk data
            pribadimu.
          </p>
        </section>

        <section className="mb-xl">
          <h2 className="font-headline-sm text-headline-sm mb-sm">
            Yang Tidak Kami Lakukan
          </h2>
          <ul className="list-disc pl-lg space-y-sm font-body-md text-body-md leading-relaxed">
            <li>Tidak ada iklan.</li>
            <li>Tidak ada pelacakan aktivitas (analytics).</li>
            <li>Tidak ada penjualan atau pemberian data ke pihak ketiga.</li>
            <li>Tidak ada pengumpulan data untuk penargetan iklan.</li>
          </ul>
        </section>

        <section className="mb-xl">
          <h2 className="font-headline-sm text-headline-sm mb-sm">
            Hak-Hakmu
          </h2>
          <p className="font-body-md text-body-md leading-relaxed mb-sm">
            Kamu berhak untuk:
          </p>
          <ul className="list-disc pl-lg space-y-sm font-body-md text-body-md leading-relaxed">
            <li>Mengakses data pribadimu yang tersimpan di aplikasi.</li>
            <li>Meminta perbaikan data yang tidak akurat.</li>
            <li>
              Menghapus akun beserta seluruh data yang terkait — termasuk
              progress belajar dan riwayat percakapan.
            </li>
          </ul>
          <p className="font-body-md text-body-md leading-relaxed mt-sm">
            Untuk permintaan hapus akun atau pertanyaan lain soal data pribadi,
            hubungi pemilik server tempat Ripen yang kamu gunakan dijalankan.
          </p>
        </section>

        <section className="mb-xl">
          <h2 className="font-headline-sm text-headline-sm mb-sm">
            Perubahan Kebijakan
          </h2>
          <p className="font-body-md text-body-md leading-relaxed">
            Kebijakan ini dapat diperbarui dari waktu ke waktu. Perubahan akan
            ditampilkan di halaman ini beserta tanggal pembaruan terakhir.
          </p>
        </section>

        <section className="mb-xl">
          <h2 className="font-headline-sm text-headline-sm mb-sm">Kontak</h2>
          <p className="font-body-md text-body-md leading-relaxed">
            Jika kamu memiliki pertanyaan mengenai kebijakan privasi ini, silakan
            hubungi pemilik server tempat Ripen berjalan.
          </p>
        </section>
      </div>
    </main>
  );
}

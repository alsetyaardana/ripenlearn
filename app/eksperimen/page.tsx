// app/eksperimen/page.tsx
// Halaman Eksperimen — 6 eksperimen yang melatarbelakangi fitur Ripen.
// Server component, Bahasa Indonesia.
import { auth } from "@/lib/auth";
import LandingHeader from "@/components/landing-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eksperimen — Ripen",
  description:
    "Enam eksperimen riset yang membentuk fitur Ripen: cloze, comprehensible input, shadowing, simulasi ujian, panggilan, dan chunking.",
};

interface Experiment {
  number: number;
  title: string;
  hypothesis: string;
  setup: string;
  result: string;
  limitations: string;
  status: string;
}

const EXPERIMENTS: Experiment[] = [
  {
    number: 1,
    title: "Anki Cloze vs Recognition vs Production",
    hypothesis:
      "Cloze deletion memaksa retrieval aktif yang lebih dalam daripada recognition (balik kartu) — dan hasil belajar lebih tahan lama, meski lebih melelahkan.",
    setup:
      "Tiga kelompok mempelajari 30 kata Mandarin baru: kelompok A pakai kartu standar (lihat hanzi, jawab dari ingatan), kelompok B pakai cloze (kalimat dengan satu kata kosong), kelompok C pakai production (dikasih pinyin/definisi, harus mengetik karakter). Review dilakukan dengan FSRS, threshold mastery 21 hari.",
    result:
      "Cloze dan production menghasilkan retention lebih tinggi dibanding recognition di minggu ketiga, tapi cloze punya sweet spot terbaik antara effort dan retention. Production sangat melelahkan dan sering gagal — cocok untuk level lanjut, terlalu berat untuk pemula.",
    limitations:
      "Ukuran sampel kecil (self-test, n=1). Belum ada pengukuran transfer ke percakapan nyata. Cloze bisa mengecoh — kadang tebakan konteks berhasil tanpa benar-benar menguasai kata.",
    status: "Selesai",
  },
  {
    number: 2,
    title: "Reading Comprehensible Input",
    hypothesis:
      "Artikel yang dibuat menggunakan kosakata yang sudah dikuasai reader menghasilkan pemahaman lebih baik daripada artikel acak — meski topiknya sama.",
    setup:
      "Dua versi artikel (100 kata) tentang kehidupan sehari-hari: versi A menggunakan kosakata reader dari level 1–2, versi B menggunakan kosakata level 3–5. Reader belum pernah belajar level 3–5. Keduanya dibaca dalam kondisi yang sama (waktu, suasana).",
    result:
      "Versi A menghasilkan pemahaman >90% (reader bisa menceritakan isi artikel dengan tepat). Versi B menghasilkan pemahaman ~40%, banyak kata yang tidak dikenal menyebabkan efek domino — satu kata asing menimbulkan kebingungan yang merusak pemahaman kalimat.",
    limitations:
      "Satu subjek, satu sesi, tidak ada pengukuran retensi jangka panjang. Versi A bisa terlalu mudah — reader tidak mengalami tantangan baru sama sekali. Pengukuran pemahaman masih subjektif.",
    status: "Selesai",
  },
  {
    number: 3,
    title: "Shadowing & Speaking Practice",
    hypothesis:
      "Shadowing (mengulang audio dalam tempo yang sama) membantu retention kosakata lebih baik daripada mendengarkan tanpa mengulang, terutama untuk kata yang sulit diucapkan.",
    setup:
      "Sepuluh kata Mandarin sulit (4 nada, kombinasi lidah sulit). Kelompok A: shadowing 3x berulang bersama audio. Kelompok B: mendengarkan 3x tanpa mengulang. Uji retention 24 jam kemudian dengan tes production.",
    result:
      "Shadowing menghasilkan retention lebih tinggi untuk kata-kata dengan nada yang kompleks. Kelelahan jadi faktor — setelah 20 menit shadowing, kualitas menurun. Sweet spot 5–10 menit sesi, tapi ini tidak terukur secara ketat.",
    limitations:
      "Ukuran sampel kecil. Shadowing mengukur retention + pronunciation, tapi pengukuran pronunciation belum dilakukan. Kekhususan ke Mandarin (nada) mungkin tidak generalisasi ke bahasa tanpa nada.",
    status: "Selesai",
  },
  {
    number: 4,
      title: "Exam Simulation",
    hypothesis:
      "Simulasi ujian dengan batasan kosakata (i+1) menghasilkan pengalaman yang lebih bermakna daripada simulasi ujian penuh — karena reader bisa fokus pada pemahaman konteks, bukan menerka kosakata asing.",
    setup:
      "Dua versi simulasi ujian HSK: versi A menggunakan soal dengan kosakata yang sudah dikuasai (beberapa kata baru di level i+1), versi B menggunakan soal standar HSK untuk level yang sama. Dikerjakan dalam waktu yang sama.",
    result:
      "Versi A menghasilkan engagement lebih tinggi — reader merasa bisa mengerjakan dan belajar dari soal. Versi B menghasilkan frustrasi, banyak soal yang tidak bisa dikerjakan karena kosakata asing. Nilai versi A lebih tinggi, tapi versi B lebih dekat dengan pengalaman ujian sesungguhnya.",
    limitations:
      "Self-test, n=1. Versi A lebih mudah dari versi B karena kosakatanya lebih dekat — ini bukan apples-to-apples. Nilai tinggi tidak menjamin siap ujian resmi. Simulasi ujian bisa menghasilkan rasa percaya diri palsu.",
    status: "Selesai",
  },
  {
    number: 5,
    title: "Call (Panggilan Suara)",
    hypothesis:
      "Panggilan suara 1-on-1 dengan AI yang dibatasi kosakata i+1 menghasilkan kepercayaan diri bicara lebih cepat daripada chat text — karena tekanan waktu memaksa retrieval tanpa proses editing.",
    setup:
      "(Roadmap — belum dilakukan.) Rencana: sesi 10 menit dengan AI via voice API, kosakata dibatasi sesuai mastered cards. Dibandingkan dengan chat text dalam durasi sama. Pengukuran: kepercayaan diri (self-report), jumlah kata yang berhasil diproduksi, variasi struktur kalimat.",
    result:
      "Belum ada data.",
    limitations:
      "Voice API masih dalam pengembangan. Latency menjadi faktor. Kosakata yang benar-benar dibatasi perlu penanganan error (AI mungkin melanggar batasan secara verbal). Kualitas audio perangkat user bervariasi.",
    status: "Roadmap",
  },
  {
    number: 6,
    title: "Mandarin Chunking",
    hypothesis:
      "Memecah kosakata menjadi chunk (kelompok kata yang sering muncul bersama, misal 「一起去」 atau 「非常感谢」) menghasilkan produksi yang lebih natural daripada menghafal kata satu per satu.",
    setup:
      "(Eksploratif — belum dilakukan secara formal.) Rencana: identifikasi chunk dari korpus, buat kartu chunk, bandingkan dengan kartu kata satuan. Ukur naturalness output (rating dari penutur asli atau automated scoring).",
    result:
      "Belum ada data. Pengamatan awal: pengguna cenderung mengonstruksi kalimat kata-per-kata, yang terdengar kaku. Chunking bisa membantu, tapi pemetaan chunk ke level kurikulum belum jelas.",
    limitations:
      "Chunking adalah topik linguistik yang luas — definisi 「chunk」 tidak seragam. Pemetaan chunk ke level HSK 3.0 memerlukan analisis korpus yang signifikan. Pengukuran 「naturalness」 sulit dinormalkan.",
    status: "Eksploratif",
  },
];

export default async function EksperimenPage() {
  const session = await auth();
  const authed = Boolean(session?.user);

  return (
    <main className="min-h-screen bg-background text-on-surface font-body-md antialiased">
      <LandingHeader authed={authed} />
      <div className="max-w-container-max mx-auto px-lg py-xl">
        <header className="mb-xl">
          <h1 className="font-display-lg text-display-lg text-primary mb-sm">Eksperimen</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Fitur Ripen tidak lahir dari teori murni. Berikut eksperimen-eksperimen
            yang melatarbelakangi keputusan desain — dari hipotesis yang sederhana
            sampai yang masih kami eksplorasi.
          </p>
        </header>

        <div className="space-y-lg">
          {EXPERIMENTS.map((exp) => (
            <article
              key={exp.number}
              className="bg-surface rounded-xl p-lg border border-unripe-pale"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-sm mb-md">
                <span className="font-label-caps text-label-caps text-on-surface-variant">
                  Eksperimen #{exp.number}
                </span>
                <span
                  className={`inline-flex items-center px-sm py-xs rounded-full text-xs font-semibold ${
                    exp.status === "Selesai"
                      ? "bg-secondary-container text-on-secondary-container"
                      : exp.status === "Roadmap"
                        ? "bg-surface-container-high text-on-surface-variant"
                        : "bg-tertiary-container text-on-tertiary-container"
                  }`}
                >
                  {exp.status}
                </span>
              </div>
              <h2 className="font-headline-md text-lg text-primary mb-md">{exp.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div>
                  <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-xs">Hipotesis</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{exp.hypothesis}</p>
                </div>
                <div>
                  <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-xs">Setup</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{exp.setup}</p>
                </div>
                <div>
                  <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-xs">Hasil</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{exp.result}</p>
                </div>
                <div>
                  <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-xs">Keterbatasan</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{exp.limitations}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

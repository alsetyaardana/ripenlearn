// app/referensi/page.tsx
// Halaman Referensi — sumber akademis, dokumen resmi, tools terkait.
// Server component, Bahasa Indonesia.
import { auth } from "@/lib/auth";
import LandingHeader from "@/components/landing-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Referensi — Ripen",
  description:
    "Sumber akademis, dokumen resmi HSK 3.0, dan tools/produk yang menjadi landasan Ripen.",
};

interface Reference {
  authors: string;
  year: string;
  title: string;
  relevance: string;
}

const ACADEMIC_REFS: Reference[] = [
  {
    authors: "Ebbinghaus, H.",
    year: "1885",
    title: "Über das Gedächtnis: Untersuchungen zur experimentellen Psychologie",
    relevance: "Dasar teori spaced repetition: ingatan memudar secara prediktif, bisa diperkuat dengan review di waktu yang tepat.",
  },
  {
    authors: "Nakata, T.",
    year: "2008",
    title: "English vocabulary learning with word lists, word cards, and computers",
    relevance: "Empiris membandingkan metode hafalan berbeda — mendukung spaced repetition dan spacing effect untuk kosakata asing.",
  },
  {
    authors: "Glover, J. A.",
    year: "1989",
    title: "Spacing effects: Implications for the design and analysis of classroom studies",
    relevance: "Spacing effect: interval antara belajar lebih penting daripada total waktu belajar.",
  },
  {
    authors: "Karpicke, J. D. & Blunt, J. R.",
    year: "2011",
    title: "Retrieval Practice Produces More Learning than Elaborative Studying with Concept Mapping",
    relevance: "Active recall (retrieve, bukan hanya membaca ulang) lebih efektif — landasan desain kartu SRS di Ripen.",
  },
  {
    authors: "Roediger, H. L. & Karpicke, J. D.",
    year: "2006",
    title: "The Power of Testing Memory: Basic Research and Implications for Educational Practice",
    relevance: "Testing effect: tes (review) bukan hanya mengukur, tapi memperkuat ingatan.",
  },
  {
    authors: "Krashen, S.",
    year: "—",
    title: "Principles and Practice in Second Language Acquisition / The Input Hypothesis",
    relevance: "Comprehensible input i+1: bahasa dipelajari dari input yang sedikit di atas level saat ini — prinsip di balik gating vocab Ripen.",
  },
  {
    authors: "Day, R. R. & Bamford, J.",
    year: "1998",
    title: "Extensive Reading in the Second Language Classroom",
    relevance: "Extensive reading (banyak membaca di level yang tepat) lebih efektif dari intensive reading (sikit tapi detail) untuk mengembangkan kosakata.",
  },
  {
    authors: "Foote, R. & McDonough, K.",
    year: "2017",
    title: "Using shadowing with young language learners",
    relevance: "Shadowing (mengulang audio) menghasilkan peningkatan pronunciation dan listening comprehension yang terukur.",
  },
  {
    authors: "Wray, A.",
    year: "2002",
    title: "Formulaic Language and the Lexicon",
    relevance: "Chunking: bahasa tidak diproduksi kata per kata, tapi dalam unit formulaik — landasan eksperimen chunking di Ripen.",
  },
  {
    authors: "Ellis, N. C.",
    year: "1996",
    title: "Sequencing in SLA: Phonological Memory, Chunking, and Points of Order",
    relevance: "Chunking memfasilitasi akuisisi: kosakata yang sering muncul bersama diproses sebagai satu unit.",
  },
  {
    authors: "Jiang, N. & Nekrasova, T. M.",
    year: "2007",
    title: "The processing of formulaic sequences by L2 speakers",
    relevance: "Penutur L2 memproses formulaic sequences lebih cepat dari string acak — mengonfirmasi bahwa chunking membantu.",
  },
  {
    authors: "Jones, J. & Haywood, S.",
    year: "2004",
    title: "Facilitating the acquisition of formulaic language",
    relevance: "Metode pengajaran chunking yang efektif untuk bahasa asing.",
  },
];

export default async function ReferensiPage() {
  const session = await auth();
  const authed = Boolean(session?.user);

  return (
    <main className="min-h-screen bg-background text-on-surface font-body-md antialiased">
      <LandingHeader authed={authed} />
      <div className="max-w-container-max mx-auto px-lg py-xl">
        <header className="mb-xl">
          <h1 className="font-display-lg text-display-lg text-primary mb-sm">Referensi</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Ripen tidak lahir dari tebakan. Ini daftar sumber akademis, dokumen resmi,
            dan tools yang menjadi landasan — termasuk asal-usul setiap keputusan desain.
          </p>
        </header>

        {/* Sumber Akademis */}
        <section id="sumber-akademis" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Sumber Akademis</h2>
          <div className="space-y-sm">
            {ACADEMIC_REFS.map((ref, i) => (
              <div key={i} className="bg-surface rounded-xl p-md border border-unripe-pale">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-xs mb-xs">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">{ref.authors} ({ref.year})</span>
                  <span className="text-on-surface font-semibold text-sm italic">{ref.title}</span>
                </div>
                <p className="text-on-surface-variant text-sm leading-relaxed">{ref.relevance}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Dokumen Resmi */}
        <section id="dokumen-resmi" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Dokumen Resmi</h2>
          <div className="bg-surface rounded-xl p-lg border border-unripe-pale">
            <div className="flex items-center gap-sm mb-sm">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>description</span>
              <h3 className="font-headline-md text-lg text-primary">新版HSK考试大纲 (HSK 3.0)</h3>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-sm">
              Diterbitkan oleh <strong>Center for Language Education and Cooperation (CLEC)</strong>,
              November 2025. Berisi lima komponen kurikulum: Task Syllabus, Topic
              Syllabus, Vocabulary, Character Syllabus, dan Grammar Syllabus.
            </p>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Ripen mengimpor data dari dokumen ini langsung — daftar kosakata, karakter,
              topik, dan struktur level. Dokumen asli tersedia dari sumber resmi CLEC
              (terenkripsi print-only untuk salinan yang kami gunakan).
            </p>
          </div>
        </section>

        {/* Tools & Proyek Terkait */}
        <section id="tools-proyek-terkait" className="mb-xl scroll-mt-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-md">Tools &amp; Proyek Terkait</h2>
          <div className="bg-surface rounded-xl p-lg border border-unripe-pale">
            <div className="flex items-center gap-sm mb-sm">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>extension</span>
              <h3 className="font-headline-md text-lg text-primary">Anki</h3>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-sm">
              Ripen bukan klon Anki, tapi kami berutang banyak pada Anki sebagai
              landasan pemahaman spaced repetition. Anki adalah perangkat sumber terbuka
              yang dikembangkan oleh Damien Elmes.
            </p>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Penghargaan penuh untuk tim Anki atas kontribusi mereka dalam
              mempopulerkan spaced repetition dan membuka jalan bagi tools seperti Ripen.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

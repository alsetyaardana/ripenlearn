// app/dashboard/page.tsx
// Halaman awal — due today, mastered count. Desain mengikuti hero "Due Today" di
// stitch/dashboard_ripen/code.html; bagian AI Credits/streak sengaja belum
// ditampilkan karena fitur AI & tracking streak baru masuk Fase 2, tidak boleh
// menampilkan angka palsu.
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CardStatus } from "@prisma/client";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id: string } | undefined)?.id;

  const [dueCount, newCount, masteredCount] = userId
    ? await Promise.all([
        prisma.cardProgress.count({
          where: { userId, dueDate: { lte: new Date() }, status: { not: CardStatus.MASTERED } },
        }),
        prisma.card.count({
          where: { progress: { none: { userId } } },
        }),
        prisma.cardProgress.count({ where: { userId, status: CardStatus.MASTERED } }),
      ])
    : [0, 0, 0];

  const totalDue = dueCount + Math.min(newCount, 20);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-container-max mx-auto px-md md:px-xl py-lg space-y-xl">
        <h1 className="font-display-lg text-display-lg text-primary">Ripen</h1>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-md">
          <div className="lg:col-span-2 bg-surface-container-low rounded-xl p-lg border border-unripe-pale flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-xs">Hari ini</h2>
              <div className="flex items-baseline gap-sm">
                <span className="font-display-lg text-display-lg text-primary">{totalDue}</span>
                <span className="font-body-lg text-body-lg text-on-surface-variant">kartu due</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm max-w-md">
                {newCount > 0
                  ? `${dueCount} kartu untuk direview, ${Math.min(newCount, 20)} kartu baru siap dipelajari.`
                  : `${dueCount} kartu untuk direview.`}
              </p>
            </div>
            <div className="relative z-10 mt-xl">
              <Link
                href="/review"
                className="inline-flex items-center gap-sm bg-primary hover:bg-primary-container text-on-primary px-lg py-md rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm"
              >
                Mulai Review
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale flex flex-col justify-between">
            <div>
              <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-md">Mastered</h2>
              <div className="flex items-end gap-xs mb-sm">
                <span className="font-headline-md text-headline-md text-primary">{masteredCount}</span>
                <span className="font-body-md text-body-md text-on-surface-variant mb-1">kata</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                Vocab yang sudah matang — siap dipakai fitur AI (segera hadir).
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

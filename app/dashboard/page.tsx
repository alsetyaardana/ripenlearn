// app/dashboard/page.tsx
// Halaman awal — due today, mastered count, scoped ke deck target belajar user.
// Desain mengikuti hero "Due Today" di stitch/dashboard_ripen/code.html.
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CardStatus } from "@prisma/client";
import { getUserSettings } from "@/lib/settings";
import { getDailyNewCardLimit } from "@/lib/review-limit";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id: string } | undefined)?.id;

  if (!userId) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-container-max mx-auto px-md md:px-xl py-lg space-y-xl">
          <h1 className="font-display-lg text-display-lg text-primary">Ripen</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Silakan login.</p>
        </div>
      </main>
    );
  }

  const settings = await getUserSettings(prisma, userId);
  const newLimit = await getDailyNewCardLimit(prisma, userId);

  // Scope kartu ke deck target (kalau ada), mirip /api/review.
  let hskIds: string[] | null = null;
  let chunkIds: string[] | null = null;
  let customIds: string[] | null = null;
  if (settings.targetDeckId) {
    const deck = await prisma.deck.findUnique({
      where: { id: settings.targetDeckId },
      select: { id: true, kind: true, userId: true },
    });
    if (deck && deck.userId === userId) {
      if (deck.kind === "HSK") {
        hskIds = (await prisma.deckHskCard.findMany({ where: { deckId: deck.id }, select: { cardId: true } })).map((r) => r.cardId);
      } else if (deck.kind === "CHUNKING") {
        chunkIds = (await prisma.deckChunkCard.findMany({ where: { deckId: deck.id }, select: { dailyTalkCardId: true } })).map((r) => r.dailyTalkCardId);
      } else {
        customIds = (await prisma.customCard.findMany({ where: { deckId: deck.id }, select: { id: true } })).map((c) => c.id);
      }
    }
  }

  const chunkCategory = settings.targetCategory ?? null;

  const [
    hskDue,
    hskNew,
    hskMastered,
    chunkDue,
    chunkNew,
    chunkMastered,
    customDue,
    customNew,
    customMastered,
  ] = await Promise.all([
    hskIds === null
      ? Promise.resolve(0)
      : hskIds.length > 0
        ? prisma.cardProgress.count({ where: { userId, cardId: { in: hskIds }, dueDate: { lte: new Date() }, status: { not: CardStatus.MASTERED } } })
        : Promise.resolve(0),
    hskIds === null
      ? Promise.resolve(0)
      : hskIds.length > 0
        ? prisma.card.count({ where: { id: { in: hskIds }, progress: { none: { userId } } } })
        : Promise.resolve(0),
    hskIds === null
      ? Promise.resolve(0)
      : hskIds.length > 0
        ? prisma.cardProgress.count({ where: { userId, cardId: { in: hskIds }, status: CardStatus.MASTERED } })
        : Promise.resolve(0),
    chunkIds === null
      ? Promise.resolve(0)
      : chunkIds.length > 0
        ? prisma.dailyTalkProgress.count({
            where: {
              userId,
              dailyTalkCardId: { in: chunkIds },
              ...(chunkCategory ? { dailyTalkCard: { category: chunkCategory } } : {}),
              dueDate: { lte: new Date() },
              status: { not: CardStatus.MASTERED },
            },
          })
        : Promise.resolve(0),
    chunkIds === null
      ? Promise.resolve(0)
      : chunkIds.length > 0
        ? prisma.dailyTalkCard.count({
            where: {
              id: { in: chunkIds },
              ...(chunkCategory ? { category: chunkCategory } : {}),
              progress: { none: { userId } },
            },
          })
        : Promise.resolve(0),
    chunkIds === null
      ? Promise.resolve(0)
      : chunkIds.length > 0
        ? prisma.dailyTalkProgress.count({ where: { userId, dailyTalkCardId: { in: chunkIds }, status: CardStatus.MASTERED } })
        : Promise.resolve(0),
    customIds === null
      ? Promise.resolve(0)
      : customIds.length > 0
        ? prisma.customCardProgress.count({ where: { userId, customCardId: { in: customIds }, dueDate: { lte: new Date() }, status: { not: CardStatus.MASTERED } } })
        : Promise.resolve(0),
    customIds === null
      ? Promise.resolve(0)
      : customIds.length > 0
        ? prisma.customCard.count({ where: { id: { in: customIds }, progress: { none: { userId } } } })
        : Promise.resolve(0),
    customIds === null
      ? Promise.resolve(0)
      : customIds.length > 0
        ? prisma.customCardProgress.count({ where: { userId, customCardId: { in: customIds }, status: CardStatus.MASTERED } })
        : Promise.resolve(0),
  ]);

  const dueCount = hskDue + chunkDue + customDue;
  const newCount = hskNew + chunkNew + customNew;
  const masteredCount = hskMastered + chunkMastered + customMastered;
  const totalDue = dueCount + Math.min(newCount, newLimit);

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
                  ? `${dueCount} kartu untuk direview, ${Math.min(newCount, newLimit)} kartu baru siap dipelajari.`
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

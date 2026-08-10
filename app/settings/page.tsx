// app/settings/page.tsx
// Settings — Rencana Belajar (all users). Kelola User pindah ke halaman Admin.
// Data awal di-render dari server (SSR), form client melakukan PUT /api/settings.
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserSettings } from "@/lib/settings";
import { listDecksForUser, type DeckSummary } from "@/lib/deck";

import SettingsForm from "./settings-form";
import SettingsHeader from "@/components/settings-header";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  let initial;
  try {
    initial = await getUserSettings(prisma, session.user.id);
  } catch {
    initial = null;
  }

  let decks: DeckSummary[] = [];
  try {
    decks = await listDecksForUser(session.user.id);
  } catch {
    decks = [];
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-container-max mx-auto px-md md:px-xl py-lg">
        <SettingsHeader />
        <SettingsForm
          decks={decks}
          initial={
            initial
              ? {
                  targetHskLevel: initial.targetHskLevel,
                  targetCategory: initial.targetCategory,
                  targetDeckId: initial.targetDeckId,
                  targetDate: initial.targetDate
                    ? initial.targetDate.toISOString().slice(0, 10)
                    : "",
                  newCardsPerDay: initial.newCardsPerDay,
                }
              : { targetHskLevel: null, targetCategory: null, targetDeckId: null, targetDate: "", newCardsPerDay: 20 }
          }
        />
      </div>
    </main>
  );
}

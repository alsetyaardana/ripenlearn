// app/deck/page.tsx
// Kelola deck: list, create, tambah subset Card global, tambah custom card.
// Server component — auth + SSR initialDecks, interaksi client di DeckManager.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listDecksForUser } from "@/lib/deck";

import DeckManager from "./deck-manager";

export default async function DeckPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const decks = await listDecksForUser(session.user.id);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-container-max mx-auto px-md md:px-xl py-lg">
        <DeckManager initialDecks={decks} />
      </div>
    </main>
  );
}

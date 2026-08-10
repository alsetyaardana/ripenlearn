// app/admin/page.tsx
// Admin dashboard — server component, hanya admin. Tab Kelola User (tier & role),
// Global Deck (statistik kartu global per level HSK), API Settings (status quota/
// endpoint). Tab switching client-side di AdminTabs.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n";
import AdminTabs from "@/components/admin-tabs";
import AdminUserTable from "@/components/admin-user-table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      tier: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  const [totalCards, cardsByLevel] = await Promise.all([
    prisma.card.count(),
    prisma.card.groupBy({
      by: ["hskLevel"],
      _count: { _all: true },
      orderBy: { hskLevel: "asc" },
    }),
  ]);

  // Server component — no access to client language context; default to "id".
  const lang = "id" as const;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-container-max mx-auto px-md md:px-xl py-lg">
        <h1 className="font-display-lg text-display-lg text-primary mb-lg">Admin</h1>
        <AdminTabs
          panels={{
            users: <AdminUserTable users={serialized} />,
            globalDeck: (
              <section className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale">
                <h2 className="font-headline-md text-headline-md text-primary mb-md">
                  {t("admin.tabGlobalDeck", lang)}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mb-md">
                  {t("admin.totalCards", lang, { count: totalCards })}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-unripe-pale">
                        <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">HSK Level</th>
                        <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">
                          {t("admin.cardsPerLevel", lang)}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cardsByLevel.map((row) => (
                        <tr key={row.hskLevel} className="border-b border-unripe-pale hover:bg-surface-container-low transition-colors">
                          <td className="font-body-md text-body-md text-on-surface py-sm px-md">HSK {row.hskLevel}</td>
                          <td className="font-body-md text-body-md text-on-surface-variant py-sm px-md">
                            {row._count._all}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ),
            api: (
              <section className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale">
                <h2 className="font-headline-md text-headline-md text-primary mb-md">
                  {t("admin.tabApiSettings", lang)}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {t("admin.apiStatus", lang)}
                </p>
                <ul className="mt-md flex flex-col gap-sm font-body-md text-body-md text-on-surface">
                  <li className="flex items-center gap-sm">
                    <span className="w-2 h-2 rounded-full bg-good-green" /> DeepSeek API —{" "}
                    {process.env.DEEPSEEK_API_KEY ? "configured" : "not configured"}
                  </li>
                  <li className="flex items-center gap-sm">
                    <span className="w-2 h-2 rounded-full bg-good-green" /> Model:{" "}
                    {process.env.DEEPSEEK_MODEL || "deepseek-v4-flash"}
                  </li>
                </ul>
              </section>
            ),
          }}
        />
      </div>
    </main>
  );
}

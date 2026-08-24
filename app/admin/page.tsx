// app/admin/page.tsx
// Admin dashboard overview — statistik ringkas.
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import AdminNav from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const [totalUsers, totalCards, totalCharacters, totalTopics, totalGrammar, cardsByLevel] =
    await Promise.all([
      prisma.user.count(),
      prisma.card.count(),
      prisma.character.count(),
      prisma.topic.count(),
      prisma.grammarPoint.count(),
      prisma.card.groupBy({
        by: ["hskLevel"],
        _count: { _all: true },
        orderBy: { hskLevel: "asc" },
      }),
    ]);

  const stats = [
    { label: "User", value: totalUsers, icon: "group", color: "text-primary" },
    { label: "Kartu Vocab", value: totalCards, icon: "style", color: "text-tertiary" },
    { label: "Karakter", value: totalCharacters, icon: "translate", color: "text-secondary" },
    { label: "Topik", value: totalTopics, icon: "topic", color: "text-primary" },
    { label: "Tata Bahasa", value: totalGrammar, icon: "spellcheck", color: "text-tertiary" },
  ];

  return (
    <div className="max-w-container-max mx-auto px-md md:px-xl py-lg space-y-xl">
      <h1 className="font-display-lg text-display-lg text-primary">Admin Dashboard</h1>
      <AdminNav />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-md mb-xl">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-surface-container-low rounded-xl p-md border border-unripe-pale"
          >
            <span className={`material-symbols-outlined text-[20px] ${s.color} mb-xs block`}>
              {s.icon}
            </span>
            <p className="font-display-md text-display-md text-on-surface">{s.value.toLocaleString()}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cards by HSK level */}
      <section className="bg-surface-container-low rounded-xl p-lg border border-unripe-pale">
        <h2 className="font-headline-md text-headline-md text-primary mb-md">
          Distribusi Kartu per Level HSK
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-unripe-pale">
                <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">
                  HSK Level
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">
                  Jumlah Kartu
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant py-sm px-md">
                  Bar
                </th>
              </tr>
            </thead>
            <tbody>
              {cardsByLevel.map((row) => {
                const maxCount = Math.max(...cardsByLevel.map((r) => r._count._all));
                const pct = maxCount > 0 ? (row._count._all / maxCount) * 100 : 0;
                return (
                  <tr
                    key={row.hskLevel}
                    className="border-b border-unripe-pale hover:bg-surface-container-low transition-colors"
                  >
                    <td className="font-body-md text-body-md text-on-surface py-sm px-md">
                      HSK {row.hskLevel}
                    </td>
                    <td className="font-body-md text-body-md text-on-surface-variant py-sm px-md">
                      {row._count._all.toLocaleString()}
                    </td>
                    <td className="py-sm px-md w-1/2">
                      <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

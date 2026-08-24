// app/admin/users/page.tsx
// Admin user management — server component, data fetching di sini.
import { prisma } from "@/lib/prisma";
import AdminUsersClient from "@/components/admin/admin-users-client";
import { requireAdmin } from "@/lib/admin-guard";
import AdminNav from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
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

  return (
    <div className="max-w-container-max mx-auto px-md md:px-xl py-lg space-y-xl">
      <h1 className="font-display-lg text-display-lg text-primary">Kelola User</h1>
      <AdminNav />
      <AdminUsersClient users={serialized} />
    </div>
  );
}

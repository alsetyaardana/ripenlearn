// app/admin/users/page.tsx
// Admin user management — server component, data fetching di sini.
import { prisma } from "@/lib/prisma";
import AdminUsersClient from "@/components/admin/admin-users-client";
import { requireAdmin } from "@/lib/admin-guard";

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
    <>
      <h1 className="font-display-lg text-display-lg text-primary mb-lg">Kelola User</h1>
      <AdminUsersClient users={serialized} />
    </>
  );
}

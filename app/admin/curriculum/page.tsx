// app/admin/curriculum/page.tsx
// Admin data kurikulum — client component untuk sub-tab switching + data fetching.
import AdminCurriculumClient from "@/components/admin/admin-curriculum-client";
import { requireAdmin } from "@/lib/admin-guard";
import AdminNav from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminCurriculumPage() {
  await requireAdmin();
  return (
    <div className="max-w-container-max mx-auto px-md md:px-xl py-lg space-y-xl">
      <h1 className="font-display-lg text-display-lg text-primary">Data Kurikulum</h1>
      <AdminNav />
      <AdminCurriculumClient />
    </div>
  );
}

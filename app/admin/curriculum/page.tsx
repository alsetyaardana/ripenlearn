// app/admin/curriculum/page.tsx
// Admin data kurikulum — client component untuk sub-tab switching + data fetching.
import AdminCurriculumClient from "@/components/admin/admin-curriculum-client";

export const dynamic = "force-dynamic";

export default function AdminCurriculumPage() {
  return (
    <>
      <h1 className="font-display-lg text-display-lg text-primary mb-lg">Data Kurikulum</h1>
      <AdminCurriculumClient />
    </>
  );
}

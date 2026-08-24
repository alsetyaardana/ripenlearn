// app/admin/layout.tsx
// Layout admin — sidebar navigasi + proteksi role ADMIN.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminSidebar from "@/components/admin/admin-sidebar";

export const metadata = {
  title: "Admin — Ripen",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-container-max mx-auto px-md md:px-xl py-lg">
          {children}
        </div>
      </main>
    </div>
  );
}

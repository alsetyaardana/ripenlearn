// app/admin/settings/page.tsx
// Admin AI settings — server component, fetch data, render client form.
import { prisma } from "@/lib/prisma";
import AdminSettingsClient from "@/components/admin/admin-settings-client";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  let settings = await prisma.globalSettings.findFirst();
  if (!settings) {
    settings = await prisma.globalSettings.create({ data: {} });
  }

  return (
    <>
      <h1 className="font-display-lg text-display-lg text-primary mb-lg">AI Settings</h1>
      <AdminSettingsClient settings={settings} />
    </>
  );
}

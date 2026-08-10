// components/app-sidebar-wrapper.tsx
// Client wrapper — sidebar + content dengan margin sesuai collapsed state.
"use client";

import AppSidebar from "./app-sidebar";
import { useSidebar } from "./sidebar-context";

interface Props {
  name?: string | null;
  image?: string | null;
  tier?: string | null;
  role?: string | null;
  children: React.ReactNode;
}

export default function AppSidebarWrapper({ children, ...props }: Props) {
  const { collapsed } = useSidebar();
  const margin = collapsed ? "md:ml-16" : "md:ml-60";

  return (
    <>
      <AppSidebar {...props} />
      <div className={`${margin} pb-14 md:pb-0 min-h-screen transition-all duration-200`}>
        {children}
      </div>
    </>
  );
}

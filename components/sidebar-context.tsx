// components/sidebar-context.tsx
// Shared state untuk sidebar collapsed/expanded. Dipakai sidebar + layout.
"use client";
import { createContext, useContext, useState } from "react";

const SidebarContext = createContext({
  collapsed: false,
  setCollapsed: (_v: boolean) => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

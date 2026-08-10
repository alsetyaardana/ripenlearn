// components/logout-button.tsx
// Server component — form POST ke NextAuth signout (pakai server action).
import { signOut } from "@/lib/auth";

export default function LogoutButton({ collapsed }: { collapsed: boolean }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className={`flex items-center gap-2 py-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors w-full ${collapsed ? "justify-center" : "px-3"}`}
        title="Keluar"
      >
        <span className="material-symbols-outlined text-[20px]">logout</span>
        {!collapsed && <span className="font-body-sm text-body-sm">Keluar</span>}
      </button>
    </form>
  );
}

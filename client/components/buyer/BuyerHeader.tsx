"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { useBuyerAuth } from "@/app/buyer/BuyerAuthContext";
import { LogOut, Menu, X } from "lucide-react";
import PropertySewaLogoMark from "@/components/brand/PropertySewaLogoMark";

const NotificationBell = dynamic(() => import("@/components/notifications/NotificationBell"), {
  ssr: false,
  loading: () => (
    <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-[#0D1C12] ring-1 ring-white/30" />
  ),
});

export default function BuyerHeader({
  mobileSidebarOpen,
  onToggleSidebar,
}: {
  mobileSidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const router = useRouter();
  const { user } = useBuyerAuth();

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <header className="h-16 shadow-md" style={{ background: "linear-gradient(90deg, #1F5B41 0%, #2D6A4E 55%, #5E7F70 100%)" }}>
      <div className="mx-auto flex h-full items-center justify-between px-4 text-white sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10 transition hover:bg-white/15 lg:hidden"
            aria-label={mobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
            title={mobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {mobileSidebarOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
          </button>
          <PropertySewaLogoMark className="h-[31px] w-[31px] shrink-0" />
            <span className="text-base font-extrabold tracking-[0.12em]">
              PROPERTY SEWA
            </span>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell
            notificationsPageHref="/buyer/notifications"
            buttonClassName="grid h-10 w-10 place-items-center rounded-full bg-white text-[#0D1C12] shadow-sm ring-1 ring-white/30 transition hover:scale-[1.03]"
          />
          <Link
            href="/buyer/profile"
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#0D1C12] shadow-sm ring-1 ring-white/30 transition hover:scale-[1.03]"
            aria-label="Buyer profile"
          >
            <span className="text-sm font-extrabold">
              {user?.name?.slice(0, 1)?.toUpperCase() || "B"}
            </span>
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#0D1C12] shadow-sm ring-1 ring-white/30 transition hover:scale-[1.02]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import { logoutByRole } from "@/app/lib/auth";
import PropertySewaLogoMark from "@/components/brand/PropertySewaLogoMark";

const NotificationBell = dynamic(() => import("@/components/notifications/NotificationBell"), {
  ssr: false,
  loading: () => (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-white/30" />
  ),
});

type AdminMeResponse = {
  success: boolean;
  user: {
    name: string;
    email: string;
    role?: string; // admin | superadmin
  };
};

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

export default function AdminHeader({
  mobileSidebarOpen = false,
  onToggleSidebar,
}: {
  mobileSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AdminMeResponse["user"] | null>(null);

  useEffect(() => {
    apiFetch<AdminMeResponse>("/auth/admin/me")
      .then((res) => setUser(res.user))
      .catch(() => setUser(null));
  }, []);

  const logout = async () => {
    try {
      await logoutByRole(user?.role);
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <header className="h-16 bg-[#316249] shadow-md">
      <div className="flex h-full items-center justify-between px-4 text-white sm:px-6">
        <div className="flex items-center gap-3">
          {onToggleSidebar ? (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10 transition hover:bg-white/20 lg:hidden"
              aria-label={mobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
              title={mobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          ) : null}

          <Link href="/admin/overview" className="flex items-center gap-3">
            <PropertySewaLogoMark className="h-7 w-7 shrink-0 sm:h-[31px] sm:w-[31px]" />
            <span className="text-[15px] font-extrabold tracking-[0.1em] text-white sm:text-base sm:tracking-[0.12em]">
              PROPERTY SEWA
            </span>
          </Link>
        </div>

        {user && (
          <div className="flex items-center gap-3 sm:gap-4">
            <NotificationBell
              notificationsPageHref="/admin/notifications"
              endpointBase="/api/admin/notifications"
              authMode="admin"
              buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-white/30 transition hover:bg-[#e9f3ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            />

            <div className="hidden text-sm font-medium text-white sm:block">{user.name}</div>

            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-white/30">
              {getInitials(user.name)}
            </div>

            <button
              onClick={logout}
              className="hidden h-10 items-center rounded-2xl bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-white/30 transition hover:bg-[#e9f3ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:inline-flex"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

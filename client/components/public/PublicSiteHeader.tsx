"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Home,
  LayoutDashboard,
  LogOut,
  Moon,
  PhoneCall,
  Sun,
} from "lucide-react";
import { apiFetchSafe } from "@/app/lib/api";
import { getDashboardPath, logoutByRole } from "@/app/lib/auth";

type SessionUser = {
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
};

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function PublicSiteHeader() {
  const router = useRouter();
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let active = true;

    (async () => {
      const meResponse = await apiFetchSafe<{ user?: SessionUser }>("/auth/me");
      if (meResponse?.user) {
        if (active) setUser(meResponse.user);
        return;
      }

      const adminResponse = await apiFetchSafe<{ user?: SessionUser }>("/auth/admin/me");
      if (active) setUser(adminResponse?.user || null);
    })();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  React.useEffect(() => {
    const storedTheme =
      typeof window !== "undefined"
        ? window.localStorage.getItem("property-sewa:theme")
        : null;

    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
      document.documentElement.dataset.theme = storedTheme;
      document.documentElement.style.colorScheme = storedTheme;
    }
  }, []);

  const handleDashboardClick = () => {
    if (!user) return;
    setMenuOpen(false);
    router.push(getDashboardPath(user.role));
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logoutByRole(user?.role);
    } finally {
      setMenuOpen(false);
      setUser(null);
      setLoggingOut(false);
      router.replace("/");
      router.refresh();
    }
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem("property-sewa:theme", nextTheme);
  };

  const avatarLabel = (user?.name || user?.email || "U").slice(0, 1).toUpperCase();

  return (
    <div className="sticky top-0 z-30">
      <div
        className="border-b border-white/10"
        style={{
          background:
            "linear-gradient(90deg, #12392B 0%, #37604E 50%, #5B786A 100%)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            aria-label="Go to Property Sewa landing page"
            className="flex items-center gap-3 rounded-2xl transition hover:opacity-95"
          >
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Home className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-wide text-white">
              PROPERTY SEWA
            </span>
          </Link>

          <div className="hidden items-center gap-10 text-sm md:flex">
            <Link
              className="text-white transition hover:text-white"
              href="/properties?type=sale"
            >
              For Sale
            </Link>
            <Link
              className="text-white/80 transition hover:text-white"
              href="/properties?type=rent"
            >
              For Rent
            </Link>
            <Link
              className="text-white/80 transition hover:text-white"
              href="/properties"
            >
              Browse All
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-2 py-2 pr-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:scale-[1.02] active:scale-[0.99]"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || "User avatar"}
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-sm font-extrabold text-emerald-900">
                      {avatarLabel}
                    </span>
                  )}
                  <span className="hidden max-w-[120px] truncate sm:block">
                    {user.name || "Account"}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition", menuOpen && "rotate-180")} />
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.45)]">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {user.name || "Signed in"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {user.role || user.email || "User"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDashboardClick}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-emerald-50"
                    >
                      <LayoutDashboard className="h-4 w-4 text-emerald-700" />
                      Dashboard
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LogOut className="h-4 w-4" />
                      {loggingOut ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black shadow-sm transition hover:scale-[1.02] active:scale-[0.99]"
                >
                  Log In
                </Link>

                <Link
                  href="/register"
                  className="rounded-full bg-[#1DFF91] px-5 py-2 text-sm font-extrabold text-black shadow-sm transition hover:scale-[1.02] hover:brightness-95 active:scale-[0.99]"
                >
                  Sign Up
                </Link>
              </>
            )}

            <Link
              href="/contact"
              aria-label="Contact support"
              title="Contact support"
              className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm transition hover:scale-[1.02] active:scale-[0.99]"
            >
              <PhoneCall className="h-4 w-4 text-[#12392B]" />
            </Link>

            <button
              onClick={handleThemeToggle}
              className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 transition hover:bg-white/15"
              aria-label="Theme"
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              type="button"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-white/90" />
              ) : (
                <Moon className="h-4 w-4 text-white/90" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

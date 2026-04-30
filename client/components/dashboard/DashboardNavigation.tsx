"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

type DashboardNavigationContextValue = {
  desktopCollapsed: boolean;
  mobileOpen: boolean;
  closeMobile: () => void;
  toggleDesktopCollapsed: () => void;
  toggleMobileOpen: () => void;
};

const DashboardNavigationContext = createContext<DashboardNavigationContextValue | null>(null);

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function DashboardNavigationProvider({
  children,
  storageKey,
}: {
  children: ReactNode;
  storageKey: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      setDesktopCollapsed(saved === "true");
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(desktopCollapsed));
    } catch {}
  }, [desktopCollapsed, storageKey]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const value = useMemo<DashboardNavigationContextValue>(
    () => ({
      desktopCollapsed,
      mobileOpen,
      closeMobile: () => setMobileOpen(false),
      toggleDesktopCollapsed: () => setDesktopCollapsed((current) => !current),
      toggleMobileOpen: () => setMobileOpen((current) => !current),
    }),
    [desktopCollapsed, mobileOpen]
  );

  return (
    <DashboardNavigationContext.Provider value={value}>
      {children}
    </DashboardNavigationContext.Provider>
  );
}

export function useDashboardNavigation() {
  const context = useContext(DashboardNavigationContext);
  if (!context) {
    throw new Error("useDashboardNavigation must be used within DashboardNavigationProvider");
  }
  return context;
}

export function DashboardNavToggleButton({
  mode,
  className = "",
  ...props
}: {
  mode: "mobile" | "desktop";
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  const { desktopCollapsed, mobileOpen, toggleDesktopCollapsed, toggleMobileOpen } =
    useDashboardNavigation();

  const isMobile = mode === "mobile";
  const Icon = isMobile
    ? mobileOpen
      ? X
      : Menu
    : desktopCollapsed
        ? PanelLeftOpen
        : PanelLeftClose;

  const label = isMobile
    ? mobileOpen
      ? "Close navigation menu"
      : "Open navigation menu"
    : desktopCollapsed
        ? "Expand sidebar"
        : "Collapse sidebar";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={isMobile ? toggleMobileOpen : toggleDesktopCollapsed}
      className={cn(
        "outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2F6B4A]",
        className
      )}
      {...props}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

export function DashboardSidebarShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { desktopCollapsed, mobileOpen, closeMobile } = useDashboardNavigation();

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation overlay"
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/40 opacity-0 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none"
        )}
        onClick={closeMobile}
      />

      <aside
        className={cn(
          "fixed left-0 top-16 z-50 flex h-[calc(100dvh-64px)] flex-col border-r border-slate-200 bg-white transition-[transform,width] duration-300 ease-out lg:static lg:top-0 lg:z-0 lg:h-full lg:translate-x-0 lg:shadow-sm",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          desktopCollapsed ? "lg:w-[88px]" : "lg:w-[272px]",
          "w-[248px] sm:w-[264px] shadow-[0_24px_48px_rgba(15,23,42,0.14)]",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 lg:hidden">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Navigation
          </span>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close navigation menu"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children}
      </aside>
    </>
  );
}

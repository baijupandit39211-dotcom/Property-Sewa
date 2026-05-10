"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Bookmark,
  Scale,
  Calculator,
  Bell,
  MessageCircle,
  Settings,
  HelpCircle,
  Flag,
} from "lucide-react";

const links = [
  { label: "Dashboard", href: "/buyer/buyer-dashboard", icon: LayoutDashboard },
  { label: "Properties", href: "/buyer/search-properties", icon: Search },
  { label: "Wishlist / Saved Properties", href: "/buyer/wishlist", icon: Bookmark },
  { label: "Compare Properties", href: "/buyer/compare", icon: Scale },
  { label: "Mortgage Calculator", href: "/buyer/mortgage-calculator", icon: Calculator },
  { label: "Alerts / Notifications", href: "/buyer/notifications", icon: Bell },
  { label: "Messages / Chat", href: "/buyer/messages", icon: MessageCircle },
  { label: "Profile Settings", href: "/buyer/profile", icon: Settings },
];

const bottomLinks = [
  { label: "Help", href: "/buyer/help", icon: HelpCircle },
  { label: "Feedback", href: "/buyer/feedback", icon: Flag },
];

export default function BuyerSidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation overlay"
        className={[
          "fixed inset-0 z-40 bg-slate-950/40 opacity-0 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none",
        ].join(" ")}
        onClick={onCloseMobile}
      />

      <aside
        className={[
          "fixed left-0 top-16 z-50 flex h-[calc(100dvh-64px)] w-64 flex-col border-r border-slate-200 bg-white shadow-[0_24px_48px_rgba(15,23,42,0.14)] transition-transform duration-300 ease-out lg:z-30 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <nav className="flex flex-col gap-1 px-3 py-4">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive = active(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onCloseMobile()}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition",
                  isActive
                    ? "bg-[#316249] text-white"
                    : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3 pb-4">
          <div className="border-t border-slate-200 pt-4">
            <div className="space-y-1">
              {bottomLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onCloseMobile()}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

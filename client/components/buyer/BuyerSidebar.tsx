"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Bookmark,
  Scale,
  Calculator,
  CalendarClock,
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
  { label: "Scheduled Visits", href: "/buyer/scheduled-visits", icon: CalendarClock },
  { label: "Alerts / Notifications", href: "/buyer/notifications", icon: Bell },
  { label: "Messages / Chat", href: "/buyer/messages", icon: MessageCircle },
  { label: "Profile", href: "/buyer/profile", icon: Settings },
];

const bottomLinks = [
  { label: "Help", href: "/faq", icon: HelpCircle },
  { label: "Feedback", href: "/contact", icon: Flag },
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
          "fixed inset-0 z-40 bg-[#0D1C12]/35 opacity-0 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none",
        ].join(" ")}
        onClick={onCloseMobile}
      />

      <aside
        className={[
          "fixed left-0 top-16 z-50 flex h-[calc(100dvh-64px)] w-64 flex-col border-r border-[#D1D5DB] bg-white shadow-[0_24px_48px_rgba(13,28,18,0.12)] transition-transform duration-300 ease-out lg:z-30 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <nav className="flex flex-col gap-1.5 px-3 py-4">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive = active(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => onCloseMobile()}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] leading-5 font-medium transition",
                  isActive
                    ? "bg-[#316249] font-semibold text-white"
                    : "text-[#0D1C12] hover:bg-[#EEF8EB] hover:text-[#316249]",
                  item.href === "/buyer/profile" ? "opacity-80" : "",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3 pb-4">
          <div className="border-t border-[#D1D5DB] pt-4">
            <div className="space-y-1">
              {bottomLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => onCloseMobile()}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] leading-5 font-medium text-[#0D1C12] hover:bg-[#EEF8EB] hover:text-[#316249]"
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Bookmark,
  Scale,
  Bell,
  MessageCircle,
  HelpCircle,
  Flag,
} from "lucide-react";

const links = [
  { label: "Dashboard", href: "/buyer/buyer-dashboard", icon: LayoutDashboard },
  { label: "Search Properties", href: "/buyer/search-properties", icon: Search },
  { label: "Wishlist / Saved Properties", href: "/buyer/wishlist", icon: Bookmark },
  { label: "Compare Properties", href: "/buyer/compare", icon: Scale },
  { label: "Alerts / Notifications", href: "/buyer/alerts", icon: Bell },
  { label: "Messages / Chat", href: "/buyer/messages", icon: MessageCircle },
];

const bottomLinks = [
  { label: "Help", href: "/buyer/help", icon: HelpCircle },
  { label: "Feedback", href: "/buyer/feedback", icon: Flag },
];

export default function BuyerSidebar() {
  const pathname = usePathname();
  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className="
        fixed left-0 top-16 z-40
        h-[calc(100vh-64px)]
        w-64
        bg-white
        border-r border-slate-200
        flex flex-col
      "
    >
      {/* ✅ NO extra card / NO outer gap */}
      <nav className="flex flex-col gap-1 px-3 py-4">
        {links.map((item) => {
          const Icon = item.icon;
          const isActive = active(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition",
                isActive
                  ? "bg-[#2C6B45] text-white"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800",
              ].join(" ")}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* bottom */}
      <div className="mt-auto px-3 pb-4">
        <div className="border-t border-slate-200 pt-4">
          <div className="space-y-1">
            {bottomLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
  );
}

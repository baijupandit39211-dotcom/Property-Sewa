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
  MessageSquareText,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    href: "/buyer/buyer-dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Search Properties",
    href: "/buyer/search-properties",
    icon: Search,
  },
  {
    label: "Wishlist / Saved Properties",
    href: "/buyer/wishlist",
    icon: Bookmark,
  },
  {
    label: "Compare Properties",
    href: "/buyer/compare",
    icon: Scale,
  },
  {
    label: "Alerts / Notifications",
    href: "/buyer/alerts",
    icon: Bell,
  },
  {
    label: "Messages / Chat",
    href: "/buyer/messages",
    icon: MessageCircle,
  },
];

const bottomItems = [
  {
    label: "Help",
    href: "/help",
    icon: HelpCircle,
  },
  {
    label: "Feedback",
    href: "/feedback",
    icon: MessageSquareText,
  },
];

export default function BuyerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-[260px] border-r bg-white px-3 py-4">
      {/* LOGO */}
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="h-9 w-9 rounded-full bg-emerald-600" />
        <span className="text-lg font-extrabold tracking-wide text-emerald-800">
          PROPERTY SEWA
        </span>
      </div>

      {/* MAIN MENU */}
      <nav className="space-y-1">
        {menuItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-emerald-700 text-white"
                  : "text-zinc-700 hover:bg-emerald-50 hover:text-emerald-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* BOTTOM MENU */}
      <div className="absolute bottom-6 left-3 right-3 space-y-1 border-t pt-4">
        {bottomItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-emerald-700 text-white"
                  : "text-zinc-700 hover:bg-emerald-50 hover:text-emerald-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

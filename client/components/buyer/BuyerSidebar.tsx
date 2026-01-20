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
  { label: "Dashboard", href: "/buyer/buyer-dashboard", icon: LayoutDashboard },
  { label: "Search Properties", href: "/buyer/search-properties", icon: Search },
  { label: "Wishlist / Saved Properties", href: "/buyer/wishlist", icon: Bookmark },
  { label: "Compare Properties", href: "/buyer/compare", icon: Scale },
  { label: "Alerts / Notifications", href: "/buyer/alerts", icon: Bell },
  { label: "My Inquiries", href: "/buyer/messages", icon: MessageCircle },
];

const bottomItems = [
  { label: "Help", href: "/help", icon: HelpCircle },
  { label: "Feedback", href: "/feedback", icon: MessageSquareText },
];

export default function BuyerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[300px] shrink-0">
      {/* Sticky sidebar (below header) */}
      <div className="sticky top-[92px]">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
          {/* Logo block */}
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1DBF85]">
                <span className="h-7 w-7 rounded-full bg-[#2D5A47]" />
              </div>
              <div className="leading-tight font-extrabold text-[#0B1F18]">
                <div>PROPERTY</div>
                <div>SEWA</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="px-4 pb-4">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
                      "hover:translate-x-1",
                      active
                        ? "bg-[#2D5A47] text-white shadow-[0_10px_24px_rgba(45,90,71,0.18)]"
                        : "text-[#0B1F18]/80 hover:bg-black/5",
                    ].join(" ")}
                  >
                    <Icon
                      className={[
                        "h-5 w-5 transition",
                        active ? "text-white" : "text-[#0B1F18]/70 group-hover:text-[#0B1F18]",
                      ].join(" ")}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom (NO absolute now) */}
          <div className="border-t border-black/5 p-4">
            <div className="space-y-2">
              {bottomItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
                      "hover:translate-x-1",
                      active
                        ? "bg-[#2D5A47] text-white"
                        : "text-[#0B1F18]/80 hover:bg-black/5",
                    ].join(" ")}
                  >
                    <Icon
                      className={[
                        "h-5 w-5 transition",
                        active ? "text-white" : "text-[#0B1F18]/70 group-hover:text-[#0B1F18]",
                      ].join(" ")}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

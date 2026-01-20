"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  Home,
  Inbox,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  PhoneIncoming,
} from "lucide-react";

const links = [
  { label: "Dashboard", href: "/seller/seller-dashboard", icon: Home },
  { label: "Listings / Manage Properties", href: "/seller/my-properties", icon: Inbox },
  { label: "Leads / Inquiries", href: "/seller/leads", icon: PhoneIncoming },
  { label: "Visit Scheduling / Calendar", href: "/seller/visit-scheduling", icon: CalendarClock },
  { label: "Messages / Chat", href: "/seller/messages", icon: MessageSquare },
  { label: "Analytics / Reports", href: "/seller/analytics", icon: BarChart3 },
];

const bottomLinks = [
  { label: "Help and Docs", href: "/seller/help", icon: LifeBuoy },
  { label: "Feedback", href: "/seller/feedback", icon: Megaphone },
];

export default function SellerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-white shadow-sm ring-1 ring-slate-200">
      <nav className="flex flex-col gap-1 px-2 py-4">
        {links.map((link, idx) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <a
              key={`${link.href}-${idx}`}
              href={link.href}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                active
                  ? "bg-[#2C6B45] text-white shadow-sm"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800",
              ].join(" ")}
            >
              <Icon className="h-5 w-5" />
              <span className="leading-none">{link.label}</span>
            </a>
          );
        })}
      </nav>

      <div className="mt-auto px-2 py-6 border-t border-slate-200">
        <div className="space-y-1">
          {bottomLinks.map((link, idx) => {
            const Icon = link.icon;
            return (
              <a
                key={`${link.href}-${idx}`}
                href={link.href}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </a>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

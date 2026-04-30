"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
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
  { label: "Notifications", href: "/seller/notifications", icon: Bell },
  { label: "Analytics / Reports", href: "/seller/analytics", icon: BarChart3 },
];

const bottomLinks = [
  { label: "Help and Docs", href: "/seller/help", icon: LifeBuoy },
  { label: "Feedback", href: "/seller/feedback", icon: Megaphone },
];

export default function SellerSidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

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
      <nav className="flex flex-col gap-1 px-2 py-4">
        {links.map((link, idx) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <a
              key={`${link.href}-${idx}`}
              href={link.href}
              onClick={() => onCloseMobile()}
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
                onClick={() => onCloseMobile()}
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
    </>
  );
}

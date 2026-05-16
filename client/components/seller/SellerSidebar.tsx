"use client";

import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
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
import { subscribeToChatSocket } from "@/app/lib/chatSocket";

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
  const [unreadMessages, setUnreadMessages] = useState(0);
  const seenMessageIdsRef = useRef(new Set<string>());

  useEffect(() => {
    // TODO: Connect to a backend unread count endpoint when available (e.g. GET /messages/unread-count).
    // For now we start at 0 and update in real-time using existing chat socket events.
    const unsubscribe = subscribeToChatSocket({
      onNewMessage: ({ message }) => {
        const messageId = String(message?._id || "").trim();
        if (!messageId || seenMessageIdsRef.current.has(messageId)) return;
        seenMessageIdsRef.current.add(messageId);

        // Only count incoming buyer messages as unread for the seller.
        if (message.senderRole !== "buyer") return;

        // If the seller is currently on the messages page, don’t increment the sidebar badge.
        // (We intentionally do not reset counts here; read state is handled elsewhere.)
        if (pathname.startsWith("/seller/messages")) return;

        setUnreadMessages((prev) => Math.min(999, prev + 1));
      },
    });

    return () => unsubscribe();
  }, [pathname]);

  const unreadLabel = unreadMessages > 99 ? "99+" : String(unreadMessages);

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
          const isMessages = link.href === "/seller/messages";
          return (
            <a
              key={`${link.href}-${idx}`}
              href={link.href}
              onClick={() => onCloseMobile()}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                active
                  ? "bg-[#316249] text-white shadow-sm"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-[#316249]",
              ].join(" ")}
            >
              <Icon className="h-5 w-5" />
              <span className="leading-none">{link.label}</span>
              {isMessages && unreadMessages > 0 ? (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[11px] font-bold text-[#316249] ring-1 ring-emerald-200">
                  {unreadLabel}
                </span>
              ) : null}
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
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-emerald-50 hover:text-[#316249]"
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

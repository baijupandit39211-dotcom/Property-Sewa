"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Building2,
  ClipboardCheck,
  Flag,
  HelpCircle,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Settings,
  SquarePlus,
  Users,
  type LucideIcon,
} from "lucide-react";

type LinkItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type ActionItem = {
  label: string;
  icon: LucideIcon;
};

const navigationItems: LinkItem[] = [
  { label: "Dashboard", href: "/admin/overview", icon: LayoutDashboard },
  { label: "Add Property", href: "/admin/add-property", icon: SquarePlus },
  { label: "View All Properties", href: "/admin/view-all-properties", icon: Building2 },
  { label: "Users Management", href: "/admin/users", icon: Users },
  { label: "Listings Approval", href: "/admin/listings-approval", icon: ClipboardCheck },
  { label: "Recent Activity", href: "/admin/recent-activity", icon: Activity },
  { label: "Contact Messages", href: "/admin/contact-messages", icon: Mail },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Reports", href: "/admin/reports", icon: Flag },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const supportItems: ActionItem[] = [
  { label: "Help and Docs", icon: HelpCircle },
  { label: "Feedback", icon: MessageSquare },
];

function isActivePath(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/admin/overview" && pathname.startsWith(`${href}/`))
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
}: LinkItem & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition-colors",
        active
          ? "bg-[#316249] text-white shadow-sm"
          : "text-slate-700 hover:bg-[#e9f3ee] hover:text-[#316249]",
      ].join(" ")}
    >
      <Icon
        className={[
          "h-5 w-5 shrink-0",
          active ? "text-white" : "text-slate-600 group-hover:text-[#316249]",
        ].join(" ")}
        strokeWidth={2}
      />
      <span className="truncate leading-none">{label}</span>
    </Link>
  );
}

function SidebarAction({ label, icon: Icon }: ActionItem) {
  return (
    <button
      type="button"
      className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-semibold text-slate-700 transition-colors hover:bg-[#e9f3ee] hover:text-[#316249]"
    >
      <Icon className="h-5 w-5 shrink-0 text-slate-600 group-hover:text-[#316249]" strokeWidth={2} />
      <span className="truncate leading-none">{label}</span>
    </button>
  );
}

export default function AdminSidebar({
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
          "fixed left-0 top-16 z-50 flex h-[calc(100dvh-64px)] w-64 shrink-0 flex-col border-r border-slate-200 bg-white shadow-[0_24px_48px_rgba(15,23,42,0.14)] ring-1 ring-slate-200 transition-transform duration-300 ease-out lg:z-30 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <nav className="flex flex-1 flex-col px-2 py-4">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <div key={item.href} onClick={() => onCloseMobile()}>
                <SidebarLink {...item} active={isActivePath(pathname, item.href)} />
              </div>
            ))}
          </div>

          <div className="mt-auto border-t border-slate-200 px-0 pt-6">
            <div className="space-y-1">
              {supportItems.map((item) => (
                <div key={item.label} onClick={() => onCloseMobile()}>
                  <SidebarAction {...item} />
                </div>
              ))}
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}

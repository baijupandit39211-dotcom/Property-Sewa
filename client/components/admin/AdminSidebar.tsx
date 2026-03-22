"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ClipboardCheck,
  Flag,
  HelpCircle,
  LayoutDashboard,
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
  { label: "Users Management", href: "/admin/users", icon: Users },
  { label: "Listings Approval", href: "/admin/listings-approval", icon: ClipboardCheck },
  { label: "Recent Activity", href: "/admin/recent-activity", icon: Activity },
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

function BrandMark() {
  return (
    <div className="relative h-12 w-12 shrink-0 rounded-2xl bg-white/10">
      <span className="absolute left-[15px] top-[12px] h-1.5 w-5 rounded-full bg-emerald-300" />
      <span className="absolute left-[15px] top-[20px] h-1.5 w-5 rounded-full bg-emerald-200" />
      <span className="absolute left-[15px] top-[28px] h-1.5 w-5 rounded-full bg-emerald-300" />
    </div>
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
          : "text-slate-700 hover:bg-emerald-50 hover:text-[#316249]",
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
      className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-[#316249]"
    >
      <Icon className="h-5 w-5 shrink-0 text-slate-600 group-hover:text-[#316249]" strokeWidth={2} />
      <span className="truncate leading-none">{label}</span>
    </button>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-emerald-900/10 bg-[#316249] px-4 py-4">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="min-w-0">
            <div className="truncate text-base font-extrabold tracking-[0.12em] text-white">
              PROPERTY SEWA
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-100/85">
              Super Admin
            </div>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col px-2 py-4">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <SidebarLink
              key={item.href}
              {...item}
              active={isActivePath(pathname, item.href)}
            />
          ))}
        </div>

        <div className="mt-auto border-t border-slate-200 px-0 pt-6">
          <div className="space-y-1">
            {supportItems.map((item) => (
              <SidebarAction key={item.label} {...item} />
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}

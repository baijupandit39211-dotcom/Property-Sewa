"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

type Item = {
  label: string;
  href: string;
};

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
        active
          ? "bg-emerald-900 text-white"
          : "text-slate-700 hover:bg-emerald-50",
      ].join(" ")}
    >
      <span
        className={[
          "h-2 w-2 rounded-full",
          active ? "bg-emerald-300" : "bg-emerald-200",
        ].join(" ")}
      />
      {label}
    </Link>
  );
}

function Section({ title, items }: { title: string; items: Item[] }) {
  const pathname = usePathname();

  return (
    <div className="mt-6">
      <div className="px-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">
        {title}
      </div>
      <div className="mt-3 space-y-2">
        {items.map((it) => (
          <NavItem
            key={it.href}
            href={it.href}
            label={it.label}
            active={pathname === it.href}
          />
        ))}
      </div>
    </div>
  );
}

export default function AdminSidebar() {
  return (
    <aside className="min-h-[calc(100vh-64px)] w-[280px] border-r bg-white px-4 py-6">
      <Section
        title="Dashboard"
        items={[{ label: "Dashboard / Overview", href: "/admin/overview" }]}
      />

      {/* ✅ Management label */}
      <Section
        title="Management"
        items={[
          { label: "Add Property", href: "/admin/add-property" }, // ✅ NEW
          { label: "Users Management", href: "/admin/users" },
          { label: "Listings Approval", href: "/admin/listings-approval" },
          { label: "Recent Activity", href: "/admin/recent-activity" },
          { label: "Leads", href: "/admin/leads" },
          { label: "Settings", href: "/admin/settings" },
        ]}
      />

      <div className="mt-10 space-y-2">
        <div className="px-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Support
        </div>

        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50">
          <span className="h-2 w-2 rounded-full bg-emerald-200" />
          Help and Docs
        </button>

        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50">
          <span className="h-2 w-2 rounded-full bg-emerald-200" />
          Feedback
        </button>
      </div>
    </aside>
  );
}

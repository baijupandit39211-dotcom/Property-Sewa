"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDashboardPath } from "../lib/auth";
import { apiFetchSafe } from "../lib/api";

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    (async () => {
      const user = await apiFetchSafe<{ user?: { role?: string } }>("/auth/me");
      if (active && user?.user) {
        router.replace(getDashboardPath(user.user.role));
        return;
      }

      const admin = await apiFetchSafe<{ user?: { role?: string } }>("/auth/admin/me");
      if (active && admin?.user) {
        router.replace(getDashboardPath(admin.user.role));
        return;
      }

      if (active) {
        router.replace("/login");
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="grid min-h-screen place-items-center bg-[#f4fbf7]">
      <div className="rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-black/5">
        <div className="text-sm font-semibold text-slate-700">Redirecting to unified login...</div>
      </div>
    </div>
  );
}

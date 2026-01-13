"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

type MeResponse = {
  success: boolean;
  user: {
    name: string;
    email: string;
    role: string;
  };
};

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

export default function BuyerHeader() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse["user"] | null>(null);

  useEffect(() => {
    apiFetch<MeResponse>("/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => {});
  }, []);

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh(); // ✅ makes sure layout re-checks role
    }
  };

  return (
    <header className="flex items-center justify-between bg-white px-8 py-4 shadow-sm">
      <div className="text-xl font-extrabold text-emerald-800">PropertySewa</div>

      {user && (
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            {user.role.toUpperCase()}
          </span>

          <div className="text-sm font-medium text-zinc-700">{user.name}</div>

          <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-700 text-sm font-bold text-white">
            {getInitials(user.name)}
          </div>

          <button
            onClick={logout}
            className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}

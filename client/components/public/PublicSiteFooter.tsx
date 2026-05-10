"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home } from "lucide-react";
import { apiFetchSafe } from "@/app/lib/api";
import { getDashboardPath } from "@/app/lib/auth";

type SessionUser = {
  name?: string;
  email?: string;
  role?: string;
};

export default function PublicSiteFooter() {
  const router = useRouter();
  const [user, setUser] = React.useState<SessionUser | null>(null);

  React.useEffect(() => {
    let active = true;

    (async () => {
      const meResponse = await apiFetchSafe<{ user?: SessionUser }>("/auth/me");
      if (meResponse?.user) {
        if (active) setUser(meResponse.user);
        return;
      }

      const adminResponse = await apiFetchSafe<{ user?: SessionUser }>("/auth/admin/me");
      if (active) setUser(adminResponse?.user || null);
    })();

    return () => {
      active = false;
    };
  }, []);

  const addPropertyHref =
    user?.role === "seller" || user?.role === "agent"
      ? "/seller/add-property"
      : user?.role === "admin" || user?.role === "superadmin"
        ? "/admin/add-property"
        : "/register";

  const handleAlertsClick = () => {
    if (user?.role === "buyer") {
      router.push("/buyer/alerts");
      return;
    }

    router.push("/login");
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#CFF9E8] via-[#8CF0C9] to-[#17D97B] py-16">
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.22) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <h3 className="text-3xl font-extrabold tracking-tight text-emerald-950">
            Get Property Alerts
          </h3>
          <p className="mt-2 text-sm text-emerald-950/70">
            Be the first to know about new listings that match your criteria.
          </p>

          <div className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row">
            <input
              className="h-12 flex-1 rounded-2xl bg-white/90 px-4 text-sm outline-none ring-1 ring-white/50 placeholder:text-slate-400"
              placeholder="Enter your email address"
            />
            <button
              type="button"
              onClick={handleAlertsClick}
              className="h-12 rounded-2xl bg-emerald-950 px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 active:scale-[0.98]"
            >
              Get Alerts
            </button>
          </div>

          <p className="mt-2 text-xs text-emerald-950/60">
            No spam. Unsubscribe anytime.
          </p>
        </div>

        <div className="relative mx-auto aspect-[1.3/1] w-full max-w-[380px]">
          <motion.div
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="relative h-full w-full"
          >
            <Image
              src="/house-3d.png"
              alt="House"
              fill
              className="object-contain drop-shadow-[0_22px_22px_rgba(0,0,0,0.22)]"
            />
          </motion.div>
        </div>
      </div>

      <div className="relative mx-auto mt-12 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 border-t border-emerald-950/15 pt-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-950/10 ring-1 ring-emerald-950/15">
                <Home className="h-5 w-5 text-emerald-950" />
              </div>
              <span className="text-sm font-bold text-emerald-950">
                Property Sewa
              </span>
            </div>
            <p className="mt-3 text-sm text-emerald-950/70">
              The modern way to find, buy, and sell your home.
            </p>
            <p className="mt-8 text-xs text-emerald-950/60">
              (c) {new Date().getFullYear()} Property Sewa. All rights reserved.
            </p>
          </div>

          <FooterCol
            title="Company"
            links={[
              { label: "Home", href: "/" },
              { label: "Login", href: "/login" },
              { label: "Register", href: "/register" },
              { label: "Dashboard", href: user ? getDashboardPath(user.role) : "/login" },
            ]}
          />
          <FooterCol
            title="Explore"
            links={[
              { label: "Buy", href: "/properties?type=sale" },
              { label: "Rent", href: "/properties?type=rent" },
              { label: "Sell", href: addPropertyHref },
              { label: "Offers", href: "/properties?offersOnly=true" },
            ]}
          />
          <FooterCol
            title="Support"
            links={[
              { label: "Search Properties", href: "/properties" },
              { label: "Forgot Password", href: "/forgot-password" },
              { label: "Dashboard", href: user ? getDashboardPath(user.role) : "/login" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div>
      <p className="text-sm font-extrabold text-emerald-950">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-emerald-950/70">
        {links.map((link) => (
          <li key={link.label}>
            <Link className="transition hover:text-emerald-950" href={link.href}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

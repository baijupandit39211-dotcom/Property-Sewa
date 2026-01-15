"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Scale,
  Search,
} from "lucide-react";

import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";

type ListResponse = {
  success: boolean;
  items: Property[];
};

const pageEnter = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function BuyerDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    apiFetch<ListResponse>("/properties?limit=8")
      .then((res) => setProperties(res.items))
      .catch(console.error);
  }, []);

  const featured = useMemo(() => properties.slice(0, 4), [properties]);
  const recommended = useMemo(() => properties.slice(4, 7), [properties]);
  const recent = useMemo(() => properties.slice(0, 2), [properties]);

  const statCards = [
    {
      title: "Recently Viewed",
      sub: `${Math.min(properties.length, 3)} properties`,
      icon: <Clock3 className="h-5 w-5 text-white" />,
    },
    { title: "Saved Searches", sub: "2 searches", icon: <Search className="h-5 w-5 text-white" /> },
    {
      title: "Saved Properties",
      sub: "5 properties",
      icon: <BookmarkCheck className="h-5 w-5 text-white" />,
    },
    { title: "Compared Properties", sub: "2 properties", icon: <Scale className="h-5 w-5 text-white" /> },
  ];

  return (
    <motion.main
      initial="hidden"
      animate="show"
      variants={pageEnter}
      className="w-full min-w-0 space-y-12"
    >
      <div className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-emerald-100/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-emerald-700">Here are properties curated for you</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Welcome back, User
            </h1>
          </div>
          <a
            href="/buyer/mortgage-calculator"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
          >
            Mortgage Calculator
            <Compass className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <StatCard key={card.title} title={card.title} sub={card.sub} icon={card.icon} />
          ))}
        </div>
      </div>

      <section className="space-y-4">
        <SectionHeader title="Featured Properties" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featured.length ? (
            featured.map((p) => <PropertyCard key={p._id} p={p} showMeta />)
          ) : (
            <EmptyCard message="No featured properties yet" />
          )}
        </div>
        <Pagination />
      </section>

      <section className="space-y-4">
        <SectionHeader title="Recommended for You" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {recommended.length ? (
            recommended.map((p) => <PropertyCard key={p._id} p={p} showMeta={false} />)
          ) : (
            <EmptyCard message="No recommendations yet" />
          )}
        </div>
        <Pagination />
      </section>

      <section className="space-y-4 pb-4">
        <SectionHeader title="Recently Viewed / Alerts" />
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
          {recent.length ? (
            recent.map((p, idx) => (
              <div
                key={p._id}
                className={[
                  "flex items-center justify-between gap-6 px-5 py-4",
                  idx !== 0 ? "border-t border-slate-200" : "",
                ].join(" ")}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-14 w-14 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100">
                    <img
                      src={p.images[0]?.url}
                      alt={p.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{p.title}</div>
                    <div className="text-xs font-semibold text-emerald-700">
                      {p.beds} beds · {p.baths} baths · {p.sqft} sq ft
                    </div>
                  </div>
                </div>
                <a
                  href={`/buyer/property/${p._id}`}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                >
                  View Details
                </a>
              </div>
            ))
          ) : (
            <div className="px-5 py-6 text-sm text-slate-600">No recent activity yet.</div>
          )}
        </div>
      </section>
    </motion.main>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>;
}

function StatCard({
  title,
  sub,
  icon,
}: {
  title: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-4 rounded-2xl bg-[#1F6D47] px-4 py-5 text-white shadow-[0_16px_30px_rgba(8,68,41,0.18)]"
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10">
        {icon}
      </div>
      <div className="space-y-1">
        <div className="text-sm font-semibold text-white/80">{sub}</div>
        <div className="text-lg font-bold leading-tight">{title}</div>
      </div>
    </motion.div>
  );
}

function PropertyCard({ p, showMeta }: { p: Property; showMeta: boolean }) {
  return (
    <motion.a
      href={`/buyer/property/${p._id}`}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.18 }}
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 hover:shadow-md"
    >
      <div className="relative h-[180px] w-full overflow-hidden bg-slate-100">
        <img
          src={p.images[0]?.url}
          alt={p.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="space-y-2 px-4 py-3">
        <div className="text-lg font-extrabold text-slate-900">{formatPrice(p)}</div>
        <div className="text-sm font-semibold text-slate-800">{p.title}</div>
        {showMeta ? (
          <div className="text-xs font-semibold text-emerald-700">
            {p.beds} beds · {p.baths} baths · {p.sqft} sq ft
          </div>
        ) : null}
        <div className="text-xs text-slate-500">{p.address || p.location}</div>
      </div>
    </motion.a>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-2xl bg-white text-sm text-slate-500 ring-1 ring-slate-200/70">
      {message}
    </div>
  );
}

function Pagination() {
  const pages = [1, 2, 3, "…", 10];
  return (
    <div className="flex items-center justify-center gap-3 pt-3">
      <button className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((v, i) => {
        const active = v === 1;
        return (
          <motion.button
            key={i}
            whileHover={{ scale: active ? 1 : 1.08 }}
            className={[
              "grid h-8 w-8 place-items-center rounded-full text-xs font-semibold transition",
              active
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            {v}
          </motion.button>
        );
      })}
      <button className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function formatPrice(p: Property) {
  const currency = p.currency || "USD";
  const price = Number(p.price) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString()}`;
  }
}

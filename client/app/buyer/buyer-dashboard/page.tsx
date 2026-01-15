"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

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

  return (
    <motion.main
      initial="hidden"
      animate="show"
      variants={pageEnter}
      className="w-full min-w-0"
    >
      {/* Header section */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[44px] leading-[1.05] font-extrabold tracking-tight text-[#0B1F18]">
            Welcome back, User
          </h1>
          <p className="mt-2 text-sm text-[#0B1F18]/60">
            Here are properties curated for you
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Recently Viewed"
          sub={`${Math.min(properties.length, 3)} properties`}
          icon={<IconHome />}
        />
        <StatCard title="Saved Searches" sub="2 searches" icon={<IconSearch />} />
        <StatCard title="Saved Properties" sub="5 properties" icon={<IconBookmark />} />
        <StatCard title="Compared Properties" sub="2 properties" icon={<IconCompare />} />
      </div>

      {/* Featured Properties */}
      <section className="mt-10">
        <h2 className="text-2xl font-extrabold text-[#0B1F18]">
          Featured Properties
        </h2>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {featured.map((p) => (
            <PropertyCard key={p._id} p={p} showMeta />
          ))}
        </div>

        <Pagination />
      </section>

      {/* Recommended for You */}
      <section className="mt-10">
        <h2 className="text-2xl font-extrabold text-[#0B1F18]">
          Recommended for You
        </h2>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommended.map((p) => (
            <PropertyCard key={p._id} p={p} showMeta={false} />
          ))}
        </div>

        <Pagination />
      </section>

      {/* Recently Viewed / Alerts */}
      <section className="mt-10 pb-8">
        <h2 className="text-2xl font-extrabold text-[#0B1F18]">
          Recently Viewed / Alerts
        </h2>

        <div className="mt-4 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
          {recent.map((p, idx) => (
            <div
              key={p._id}
              className={[
                "flex items-center justify-between gap-6 p-5",
                idx !== 0 ? "border-t border-black/5" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-14 w-14 rounded-xl overflow-hidden bg-black/5 shrink-0">
                  <img
                    src={p.images[0]?.url}
                    alt={p.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <div className="font-semibold text-[#0B1F18] truncate">
                    {p.title}
                  </div>
                  <div className="text-sm text-[#1DBF85]">
                    {p.beds} beds · {p.baths} baths · {p.sqft} sq ft
                  </div>
                </div>
              </div>

              <a
                href={`/buyer/property/${p._id}`}
                className="h-10 rounded-xl bg-[#EAF6EF] px-5 text-sm font-semibold text-[#0B1F18] ring-1 ring-black/10 grid place-items-center"
              >
                View Details
              </a>
            </div>
          ))}
        </div>
      </section>
    </motion.main>
  );
}

/* UI components */

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
      className="rounded-2xl bg-[#2D5A47] p-5 text-white shadow-[0_10px_26px_rgba(1,43,33,0.16)]"
    >
      <div className="opacity-95">{icon}</div>
      <div className="mt-5 text-lg font-bold">{title}</div>
      <div className="mt-1 text-sm text-white/70">{sub}</div>
    </motion.div>
  );
}

function PropertyCard({ p, showMeta }: { p: Property; showMeta: boolean }) {
  return (
    <motion.a
      href={`/buyer/property/${p._id}`}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden block hover:shadow-md"
    >
      <div className="h-[150px] w-full bg-black/5">
        <img
          src={p.images[0]?.url}
          alt={p.title}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="p-4">
        <div className="font-semibold text-[#0B1F18] leading-snug">{p.title}</div>

        <div className="mt-1 font-bold text-[#1DBF85]">
          {p.currency} {p.price.toLocaleString()}
        </div>

        {showMeta ? (
          <div className="mt-1 text-sm text-[#1DBF85]">
            {p.beds} beds · {p.baths} baths · {p.sqft} sq ft
          </div>
        ) : null}

        <div className="mt-1 text-xs text-[#0B1F18]/60">{p.location}</div>
      </div>
    </motion.a>
  );
}

function Pagination() {
  return (
    <div className="flex items-center justify-center gap-3 pt-5">
      <button className="h-8 w-8 rounded-full bg-white ring-1 ring-black/10 text-[#0B1F18]/70 hover:bg-black/[0.03]">
        ‹
      </button>

      {[1, 2, 3, "…", 10].map((v, i) => {
        const active = v === 1;
        return (
          <motion.button
            key={i}
            whileHover={{ scale: active ? 1 : 1.12 }}
            className={[
              "h-7 w-7 rounded-full text-xs font-semibold transition",
              active ? "bg-[#1DBF85] text-white" : "text-[#0B1F18]/70 hover:bg-black/[0.03]",
            ].join(" ")}
          >
            {v}
          </motion.button>
        );
      })}

      <button className="h-8 w-8 rounded-full bg-white ring-1 ring-black/10 text-[#0B1F18]/70 hover:bg-black/[0.03]">
        ›
      </button>
    </div>
  );
}

/* Icons */
function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="white"
        strokeWidth="2"
      />
      <path
        d="M21 21l-4.3-4.3"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconBookmark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 3h10a1 1 0 0 1 1 1v17l-6-3-6 3V4a1 1 0 0 1 1-1Z"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconCompare() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3v18M5 7h14M7 7l-4 7h8l-4-7Zm10 0l-4 7h8l-4-7Z"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

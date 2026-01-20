"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Home,
  Building2,
  Tag,
  BriefcaseBusiness,
  Building,
  ShieldCheck,
  BadgeCheck,
  SlidersHorizontal,
  CalendarCheck2,
  Headphones,
  BarChart3,
  Search,
  Heart,
  ChevronRight,
  PhoneCall, // ✅ this is the icon you want
  Moon,
} from "lucide-react";

type Property = {
  id: string;
  title: string;
  location: string;
  price: string;
  image: string;
  beds: number;
  baths: number;
  sqft: number;
};

const featured: Property[] = [
  {
    id: "p1",
    title: "Luxury Lane Villa",
    location: "Beverly Hills, CA",
    price: "$2,800,000",
    image: "/p1.jpg",
    beds: 5,
    baths: 4,
    sqft: 4100,
  },
  {
    id: "p2",
    title: "Oak Street Apartment",
    location: "Austin, TX",
    price: "$850,000",
    image: "/p2.jpg",
    beds: 2,
    baths: 2,
    sqft: 1200,
  },
  {
    id: "p3",
    title: "Highrise View Condo",
    location: "Miami, FL",
    price: "$1,200,000",
    image: "/p3.jpg",
    beds: 3,
    baths: 2,
    sqft: 1500,
  },
  {
    id: "p4",
    title: "Forest Cabin Home",
    location: "Aspen, CO",
    price: "$650,000",
    image: "/p4.jpg",
    beds: 3,
    baths: 2,
    sqft: 2000,
  },
];

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.55, ease: "easeOut" },
  }),
};

export default function DashboardLandingLike() {
  const [mode, setMode] = React.useState<"buy" | "rent" | "sell">("buy");
  const [activePage, setActivePage] = React.useState(1);

  return (
    <div className="min-h-screen bg-white">
      {/* ✅ NAVBAR (Figma exact gradient + buttons + phone icon) */}
      <div className="sticky top-0 z-30">
        <div
          className="border-b border-white/10"
          style={{
            background:
              "linear-gradient(90deg, #12392B 0%, #37604E 50%, #5B786A 100%)",
          }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            {/* Left brand */}
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <Home className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-semibold tracking-wide text-white">
                PROPERTY SEWA
              </span>
            </div>

            {/* Center links */}
            <div className="hidden items-center gap-10 text-sm md:flex">
              <Link
                className="text-white hover:text-white transition"
                href="/properties?type=sale"
              >
                For Sale
              </Link>
              <Link
                className="text-white/80 hover:text-white transition"
                href="/properties?type=rent"
              >
                For Rent
              </Link>
              <Link
                className="text-white/80 hover:text-white transition"
                href="/agents"
              >
                Agents
              </Link>
            </div>

            {/* Right actions (exact like your crop) */}
            <div className="flex items-center gap-3">
              {/* Log In: white pill, black text */}
              <Link
                href="/login"
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black shadow-sm transition hover:scale-[1.02] active:scale-[0.99]"
              >
                Log In
              </Link>

              {/* Sign Up: neon mint */}
              <Link
                href="/register"
                className="rounded-full bg-[#1DFF91] px-5 py-2 text-sm font-extrabold text-black shadow-sm transition hover:brightness-95 hover:scale-[1.02] active:scale-[0.99]"
              >
                Sign Up
              </Link>

              {/* Phone icon: white circle + dark green icon */}
              <button
                type="button"
                aria-label="Call"
                title="Call"
                className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm transition hover:scale-[1.02] active:scale-[0.99]"
              >
                <PhoneCall className="h-4 w-4 text-[#12392B]" />
              </button>

              {/* optional theme icon (keep if you want) */}
              <button
                onClick={() => {}}
                className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 transition hover:bg-white/15"
                aria-label="Theme"
                title="Theme"
                type="button"
              >
                <Moon className="h-4 w-4 text-white/90" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* ✅ Figma-like hero background (your vertical gradient) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #012C21 0%, #1DBF85 45%, #A5EFD1 100%)",
          }}
        />

        {/* dotted grid */}
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* soft depth left */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-black/10 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          {/* LEFT */}
          <div>
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0}
              className="text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl"
            >
              The Modern Way to
              <br />
              Find
              <br />
              Home
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
              className="mt-6 max-w-xl text-sm text-white/85 sm:text-base"
            >
              Discover your next chapter with us. Effortless, elegant, and
              exclusively yours.
            </motion.p>

            {/* Search Card */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={2}
              className="mt-10 max-w-xl rounded-2xl bg-white/90 p-4 shadow-xl ring-1 ring-white/30 backdrop-blur"
            >
              {/* Tabs */}
              <div className="flex gap-2">
                <TabButton active={mode === "buy"} onClick={() => setMode("buy")}>
                  Buy
                </TabButton>
                <TabButton
                  active={mode === "rent"}
                  onClick={() => setMode("rent")}
                >
                  Rent
                </TabButton>
                <TabButton
                  active={mode === "sell"}
                  onClick={() => setMode("sell")}
                >
                  Sell
                </TabButton>
              </div>

              {/* Search Row */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-emerald-100">
                  <Search className="h-4 w-4 text-emerald-600" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    placeholder="Enter an address, neighborhood, city, or ZIP code"
                  />
                </div>

                <button
                  className={cn(
                    "rounded-xl px-6 py-3 text-sm font-semibold text-white",
                    "bg-emerald-500 hover:bg-emerald-600",
                    "shadow-md shadow-emerald-500/25",
                    "transition active:scale-[0.98]"
                  )}
                  type="button"
                >
                  Search
                </button>
              </div>

              {/* Filters */}
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill>Price Range</Pill>
                <Pill>Beds &amp; Baths</Pill>
                <Pill>Property Type</Pill>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/properties"
                  className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700 transition active:scale-[0.98]"
                >
                  Browse Properties
                </Link>
                <Link
                  href="/properties/new"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50 transition active:scale-[0.98]"
                >
                  List Your Property
                </Link>
              </div>

              {/* Trust row */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Verified Listings
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Secure Transactions
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Top Agents
                </span>
              </div>
            </motion.div>
          </div>

          {/* RIGHT (3D House) */}
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
            className="relative"
          >
            <div className="relative mx-auto aspect-[1.1/1] w-full max-w-[520px]">
              <div className="absolute inset-0 rounded-3xl bg-white/10 ring-1 ring-white/15 shadow-2xl" />
              <div className="absolute -inset-6 rounded-[2.2rem] bg-emerald-200/20 blur-2xl" />

              <motion.div
                whileHover={{ y: -6, rotate: -0.6 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="relative h-full w-full"
              >
                <Image
                  src="/house-3d.png"
                  alt="3D House"
                  fill
                  priority
                  className="object-contain drop-shadow-[0_28px_28px_rgba(0,0,0,0.25)]"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Everything should be this easy */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
          >
            Everything should be this easy.
          </motion.h2>
          <p className="mt-3 text-center text-sm text-slate-500">
            Three steps. Three minutes.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-5">
            <MiniCard icon={<Home className="h-5 w-5" />} title="Buy a Home" />
            <MiniCard
              icon={<Building2 className="h-5 w-5" />}
              title="Rent a Home"
            />
            <MiniCard icon={<Tag className="h-5 w-5" />} title="Sell a Home" />
            <MiniCard
              icon={<BriefcaseBusiness className="h-5 w-5" />}
              title="Commercial"
            />
            <MiniCard
              icon={<Building className="h-5 w-5" />}
              title="New Projects"
            />
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="bg-white pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Featured Properties
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Handpicked listings from the best locations, just for you.
              </p>
            </div>

            <Link
              href="/properties"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              View All{" "}
              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {featured.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              >
                <PropertyCard p={p} />
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-10 flex items-center justify-center gap-2 text-sm">
            <PageBtn
              label="‹"
              onClick={() => setActivePage((p) => Math.max(1, p - 1))}
            />
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setActivePage(n)}
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full transition",
                  n === activePage
                    ? "bg-emerald-500 text-white shadow shadow-emerald-500/25"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {n}
              </button>
            ))}
            <span className="px-2 text-slate-400">…</span>
            <button className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
              10
            </button>
            <PageBtn
              label="›"
              onClick={() => setActivePage((p) => Math.min(10, p + 1))}
            />
          </div>
        </div>
      </section>

      {/* Partner section */}
      <section className="bg-emerald-50/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h3 className="text-center text-3xl font-extrabold tracking-tight text-slate-900">
            Your Partner in Finding a Home
          </h3>
          <p className="mt-2 text-center text-sm text-slate-500">
            We provide a complete service for the sale, purchase, or rental of
            real estate.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <FeatureItem
              icon={<BadgeCheck className="h-5 w-5" />}
              title="Verified Agents"
              desc="Work with the best and most trusted agents in the industry."
            />
            <FeatureItem
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Transparency Guarantee"
              desc="No hidden fees, clear processes, and honest advice."
            />
            <FeatureItem
              icon={<SlidersHorizontal className="h-5 w-5" />}
              title="Smart Filters"
              desc="Find the perfect property with our advanced filtering options."
            />
            <FeatureItem
              icon={<CalendarCheck2 className="h-5 w-5" />}
              title="Instant Viewing Slots"
              desc="Book property viewings instantly at your convenience."
            />
            <FeatureItem
              icon={<Headphones className="h-5 w-5" />}
              title="24/7 Support"
              desc="Our dedicated support team is here for you anytime."
            />
            <FeatureItem
              icon={<BarChart3 className="h-5 w-5" />}
              title="Market Insights"
              desc="Stay ahead with real-time data and market trends."
            />
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/how-it-works"
              className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700 transition active:scale-[0.98]"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Get Alerts CTA + Footer */}
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
              <button className="h-12 rounded-2xl bg-emerald-950 px-5 text-sm font-semibold text-white hover:bg-emerald-900 transition active:scale-[0.98]">
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
                © {new Date().getFullYear()} Property Sewa. All rights reserved.
              </p>
            </div>

            <FooterCol title="Company" links={["About Us", "Careers", "Press", "Blog"]} />
            <FooterCol title="Explore" links={["Buy", "Rent", "Sell", "Agents"]} />
            <FooterCol title="Support" links={["Help Center", "Contact Us", "FAQ"]} />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------ Small UI pieces ------------------ */

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-semibold transition",
        active
          ? "bg-emerald-600 text-white shadow shadow-emerald-600/25"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      )}
    >
      {children}
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
    >
      {children}
    </button>
  );
}

function MiniCard({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 240, damping: 16 }}
      className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 hover:shadow-md"
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
        {icon}
      </div>
      <p className="mt-3 text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">
        Find your dream home from thousands of listings.
      </p>
    </motion.div>
  );
}

function PropertyCard({ p }: { p: Property }) {
  return (
    <Link href={`/properties/${p.id}`} className="group block">
      <motion.div
        whileHover={{ y: -8 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 hover:shadow-md"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={p.image}
            alt={p.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.06]"
          />
          <button
            type="button"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-white/60 opacity-0 transition group-hover:opacity-100"
            aria-label="Save"
            onClick={(e) => e.preventDefault()}
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-lg font-extrabold text-slate-900">{p.price}</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{p.title}</p>
          <p className="mt-1 text-xs text-slate-500">{p.location}</p>

          <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
            <span>{p.beds} bd</span>
            <span>•</span>
            <span>{p.baths} ba</span>
            <span>•</span>
            <span>{p.sqft} sqft</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function FeatureItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 240, damping: 16 }}
      className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-emerald-100/50 hover:shadow-md"
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
        {icon}
      </div>
      <p className="mt-3 text-sm font-extrabold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </motion.div>
  );
}

function PageBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
      type="button"
    >
      {label}
    </button>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <p className="text-sm font-extrabold text-emerald-950">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-emerald-950/70">
        {links.map((l) => (
          <li key={l}>
            <a className="hover:text-emerald-950 transition" href="#">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

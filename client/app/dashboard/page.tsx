// app/page.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";

type Property = {
  id: string;
  title: string;
  location: string;
  price: string;
  image: string; // ✅ local public path
  beds: number;
  baths: number;
  sqft: number;
};

// ✅ Use YOUR uploaded images from: apps/web/public/images/home/
const featured: Property[] = [
  {
    id: "p1",
    title: "Luxury Lane Villa",
    location: "Beverly Hills, CA",
    price: "$2,800,000",
    image: "/images/home/featured-1.jpg",
    beds: 5,
    baths: 4,
    sqft: 4100,
  },
  {
    id: "p2",
    title: "Oak Street Apartment",
    location: "Austin, TX",
    price: "$850,000",
    image: "/images/home/featured-2.jpg",
    beds: 2,
    baths: 2,
    sqft: 1250,
  },
  {
    id: "p3",
    title: "Highrise View Condo",
    location: "Miami, FL",
    price: "$1,200,000",
    image: "/images/home/featured-3.jpg",
    beds: 3,
    baths: 2,
    sqft: 1500,
  },
  {
    id: "p4",
    title: "Forest Cabin",
    location: "Aspen, CO",
    price: "$650,000",
    image: "/images/home/featured-4.jpg",
    beds: 2,
    baths: 1,
    sqft: 980,
  },
];

function Pill({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      className={[
        "rounded-full px-4 py-2 text-sm font-medium transition",
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "bg-white/70 text-slate-700 hover:bg-white",
      ].join(" ")}
      type="button"
    >
      {children}
    </button>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_12px_30px_rgba(2,6,23,0.06)]">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <h4 className="text-base font-semibold text-slate-900">{title}</h4>
      <p className="mt-1 text-sm leading-6 text-slate-600">{desc}</p>
    </div>
  );
}

function TinyIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-white/30 bg-emerald-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200">
              <TinyIcon d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
            </span>
            <span className="text-sm font-semibold tracking-wide text-white">
              PROPERTY SEWA
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-emerald-50/90 md:flex">
            <Link className="hover:text-white" href="#for-sale">
              For Sale
            </Link>
            <Link className="hover:text-white" href="#for-rent">
              For Rent
            </Link>
            <Link className="hover:text-white" href="#agents">
              Agents
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Log In
            </Link>

            <Link
              href="/register"
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-300"
            >
              Sign Up
            </Link>

            <button
              className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"
              type="button"
              aria-label="Theme"
            >
              <TinyIcon d="M12 3a6 6 0 1 0 9 9 7 7 0 0 1-9-9Z" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-700 to-emerald-100">
        {/* dotted texture */}
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.28)_1px,transparent_0)] [background-size:18px_18px]" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          {/* left */}
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold leading-tight text-white md:text-5xl">
              The Modern Way to Find <br className="hidden md:block" />
              Home
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-50/90">
              Discover your next chapter with us. Effortless, elegant, and
              exclusively yours.
            </p>

            {/* search card */}
            <div className="mt-8 rounded-2xl border border-white/30 bg-white/90 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.25)] backdrop-blur">
              <div className="flex gap-2">
                <Pill active>Buy</Pill>
                <Pill>Rent</Pill>
                <Pill>Sell</Pill>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <span className="text-slate-400">
                    <TinyIcon d="M21 21l-4.3-4.3m1.8-4.2a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                  </span>
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    placeholder="Enter an address, neighborhood, city, or ZIP code"
                  />
                </div>

                <button
                  type="button"
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
                >
                  Search
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Price Range
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Beds &amp; Baths
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Property Type
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/properties"
                  className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Browse Properties
                </Link>
                <Link
                  href="/seller/list-property"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
                >
                  List Your Property
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-slate-600">
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
            </div>
          </div>

          {/* right hero image */}
          <div className="relative z-10 mx-auto w-full max-w-xl">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-[0_24px_80px_rgba(2,6,23,0.35)]">
              {/* ✅ LOCAL IMAGE */}
              <Image
                src="/images/home/hero-house.png"
                alt="Modern house"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* EASY SECTION */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 md:text-3xl">
            Everything should be this easy.
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Three steps. Three minutes.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {[
              {
                title: "Buy a Home",
                desc: "Find your dream home from thousands of listings.",
                icon: <TinyIcon d="M3 10.5 12 3l9 7.5V21H3V10.5Z" />,
              },
              {
                title: "Rent a Home",
                desc: "Discover apartments, condos, and houses for rent.",
                icon: (
                  <TinyIcon d="M4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M9 21v-6h6v6" />
                ),
              },
              {
                title: "Sell a Home",
                desc: "Get a free valuation and sell with top agents.",
                icon: <TinyIcon d="M12 6v12m6-6H6" />,
              },
              {
                title: "Commercial",
                desc: "Explore office, retail, and industrial properties.",
                icon: (
                  <TinyIcon d="M3 21h18M6 21V7m12 14V7M8 9h3m2 0h3M8 12h3m2 0h3M8 15h3m2 0h3" />
                ),
              },
              {
                title: "New Projects",
                desc: "Be the first to know about new constructions.",
                icon: (
                  <TinyIcon d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7l3-7Z" />
                ),
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-[0_12px_30px_rgba(2,6,23,0.05)]"
              >
                <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  {c.icon}
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {c.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PROPERTIES */}
      <section className="bg-white" id="for-sale">
        <div className="mx-auto max-w-6xl px-4 pb-16">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Featured Properties
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Handpicked listings from the best locations, just for you.
              </p>
            </div>

            <Link
              href="/properties"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-600"
            >
              View All →
            </Link>
          </div>

          {/* tabs */}
          <div className="mt-6 flex gap-2">
            <button className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
              Popular
            </button>
            <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
              Newest
            </button>
            <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
              Price
            </button>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-4">
            {featured.map((p) => (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_14px_40px_rgba(2,6,23,0.08)]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm hover:bg-white"
                    aria-label="Save"
                    onClick={(e) => e.preventDefault()}
                  >
                    <TinyIcon d="M12 21s-7-4.4-9.5-8.5C.7 9.3 2.3 6 5.9 6c2 0 3.3 1.1 4.1 2.2C10.8 7.1 12.1 6 14.1 6c3.6 0 5.2 3.3 3.4 6.5C19 16.6 12 21 12 21Z" />
                  </button>
                </div>

                <div className="p-4">
                  <div className="text-lg font-extrabold text-slate-900">
                    {p.price}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">
                    {p.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{p.location}</div>

                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <TinyIcon d="M7 20V10a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10" />
                      {p.beds} bd
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <TinyIcon d="M7 10V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" />
                      {p.baths} ba
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <TinyIcon d="M4 8h16M4 16h16M8 4v16M16 4v16" />
                      {p.sqft} sqft
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* pagination look */}
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-500">
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50">
              ‹
            </button>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 font-semibold text-white">
              1
            </span>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50">
              2
            </button>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50">
              3
            </button>
            <span className="px-2">…</span>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50">
              10
            </button>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50">
              ›
            </button>
          </div>
        </div>
      </section>

      {/* PARTNER SECTION */}
      <section className="bg-white" id="agents">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 md:text-3xl">
            Your Partner in Finding a Home
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            We provide a complete service for the sale, purchase, or rental of
            real estate.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <FeatureCard
              title="Verified Agents"
              desc="Work with the best and most trusted agents in the industry."
              icon={<TinyIcon d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4Z" />}
            />
            <FeatureCard
              title="Transparency Guarantee"
              desc="No hidden fees, clear processes, and honest advice."
              icon={<TinyIcon d="M12 20h9M12 4h9M4 9h16M4 15h16" />}
            />
            <FeatureCard
              title="Smart Filters"
              desc="Find the perfect property with advanced filtering options."
              icon={<TinyIcon d="M4 6h16l-6 7v5l-4 2v-7L4 6Z" />}
            />
            <FeatureCard
              title="Instant Viewing Slots"
              desc="Book property viewings instantly at your convenience."
              icon={
                <TinyIcon d="M8 7V3m8 4V3M4 11h16M6 21h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
              }
            />
            <FeatureCard
              title="24/7 Support"
              desc="Our dedicated support team is here for you anytime."
              icon={
                <TinyIcon d="M4 12a8 8 0 0 1 16 0v5a3 3 0 0 1-3 3h-2v-6h2a1 1 0 0 0 1-1v-1a6 6 0 0 0-12 0v1a1 1 0 0 0 1 1h2v6H7a3 3 0 0 1-3-3v-5Z" />
              }
            />
            <FeatureCard
              title="Market Insights"
              desc="Stay ahead with real-time data and market trends."
              icon={<TinyIcon d="M4 19V5m0 14h16M8 15l3-3 3 2 4-6" />}
            />
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/how-it-works"
              className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* ALERTS CTA */}
      <section className="bg-gradient-to-r from-emerald-100 via-emerald-200 to-emerald-400">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Get Property Alerts
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              Be the first to know about new listings that match your criteria.
            </p>

            <div className="mt-6 flex w-full max-w-xl items-center gap-3 rounded-2xl bg-white/70 p-3 shadow-[0_18px_50px_rgba(2,6,23,0.12)] backdrop-blur">
              <input
                className="h-11 w-full rounded-xl bg-white px-4 text-sm outline-none ring-1 ring-slate-200 placeholder:text-slate-400"
                placeholder="Enter your email address"
                type="email"
              />
              <button className="h-11 whitespace-nowrap rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500">
                Get Alerts
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-700/80">
              No spam. Unsubscribe anytime.
            </p>
          </div>

          <div className="mx-auto w-full max-w-lg">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-[0_24px_80px_rgba(2,6,23,0.25)]">
              {/* ✅ LOCAL IMAGE */}
              <Image
                src="/images/home/alerts-house.png"
                alt="Property alerts"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="bg-emerald-500/80">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="grid gap-8 md:grid-cols-5">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900/20 text-emerald-950">
                    <TinyIcon d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
                  </span>
                  <span className="text-sm font-extrabold text-emerald-950">
                    Property Sewa
                  </span>
                </div>
                <p className="mt-3 max-w-sm text-sm text-emerald-950/80">
                  The modern way to find, buy, rent, and sell your home.
                </p>
              </div>

              {[
                { title: "Company", links: ["About Us", "Careers", "Press", "Blog"] },
                { title: "Explore", links: ["Buy", "Rent", "Sell", "Agents"] },
                { title: "Support", links: ["Help Center", "Contact Us", "FAQ"] },
                { title: "Legal", links: ["Terms of Service", "Privacy Policy", "Cookie Policy"] },
              ].map((col) => (
                <div key={col.title}>
                  <h4 className="text-sm font-bold text-emerald-950">
                    {col.title}
                  </h4>
                  <ul className="mt-3 space-y-2 text-sm text-emerald-950/80">
                    {col.links.map((l) => (
                      <li key={l}>
                        <Link href="#" className="hover:text-emerald-950">
                          {l}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-emerald-900/15 pt-6 text-xs text-emerald-950/80 md:flex-row">
              <p>© {new Date().getFullYear()} Property Sewa. All rights reserved.</p>
              <div className="flex items-center gap-3">
                <Link
                  href="#"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/40 text-emerald-950 hover:bg-white/60"
                  aria-label="Social"
                >
                  <TinyIcon d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2Z" />
                </Link>
                <Link
                  href="#"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/40 text-emerald-950 hover:bg-white/60"
                  aria-label="Social"
                >
                  <TinyIcon d="M16 8a6 6 0 0 1-6 6 6 6 0 0 1-6-6 6 6 0 0 1 6-6 6 6 0 0 1 6 6Z" />
                </Link>
                <Link
                  href="#"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/40 text-emerald-950 hover:bg-white/60"
                  aria-label="Social"
                >
                  <TinyIcon d="M4 4h16v16H4V4Zm4 12V10m4 6V8m4 8v-4" />
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}

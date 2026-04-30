"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import OfferBadge from "@/components/offers/OfferBadge";
import PublicSiteHeader from "@/components/public/PublicSiteHeader";
import { apiFetch, apiFetchSafe } from "@/app/lib/api";
import { getDashboardPath } from "@/app/lib/auth";
import {
  Home,
  Building2,
  ShieldCheck,
  BadgeCheck,
  SlidersHorizontal,
  CalendarCheck2,
  Headphones,
  BarChart3,
  Search,
  Heart,
  ChevronRight,
} from "lucide-react";

type Property = {
  id?: string;
  _id?: string;
  title: string;
  location: string;
  price: string;
  image: string;
  beds: number;
  baths: number;
  sqft: number;
  offerCategory?: "none" | "dashain" | "latest" | "hot" | "limited_time";
  offerBadge?: string;
  offerTitle?: string;
  offerActive?: boolean;
  currency?: string;
  address?: string;
  images?: { url: string }[];
};

type PropertyListResponse = {
  items: Array<{
    _id: string;
    title: string;
    location: string;
    address?: string;
    price: number;
    currency?: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    images?: { url: string }[];
    offerCategory?: "none" | "dashain" | "latest" | "hot" | "limited_time";
    offerBadge?: string;
    offerTitle?: string;
    offerActive?: boolean;
  }>;
};

type SessionUser = {
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
};

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.55, ease: "easeOut" as const },
  }),
};

export default function DashboardLandingLike() {
  const router = useRouter();
  const [mode, setMode] = React.useState<"buy" | "rent" | "sell">("buy");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [allProperties, setAllProperties] = React.useState<Property[]>([]);
  const [user, setUser] = React.useState<SessionUser | null>(null);

  React.useEffect(() => {
    apiFetch<PropertyListResponse>("/properties?limit=48")
      .then((res) => {
        const mapped = (res.items || []).map((item) => ({
          _id: item._id,
          title: item.title,
          location: item.address || item.location,
          price: `${item.currency || "NPR"} ${Number(item.price || 0).toLocaleString()}`,
          image: item.images?.[0]?.url || "/placeholder.jpg",
          beds: Number(item.beds || 0),
          baths: Number(item.baths || 0),
          sqft: Number(item.sqft || 0),
          offerCategory: item.offerCategory || "none",
          offerBadge: item.offerBadge,
          offerTitle: item.offerTitle,
          offerActive: Boolean(item.offerActive),
          currency: item.currency || "NPR",
          address: item.address || "",
          images: item.images || [],
        }));
        setAllProperties(mapped);
      })
      .catch(() => setAllProperties([]));
  }, []);

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

  const browseHref =
    mode === "rent"
      ? "/properties?type=rent"
      : mode === "buy"
        ? "/properties?type=sale"
        : "/properties";

  const handleSearch = () => {
    if (mode === "sell") {
      router.push(addPropertyHref);
      return;
    }

    const params = new URLSearchParams();
    params.set("type", mode === "rent" ? "rent" : "sale");
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    router.push(`/properties?${params.toString()}`);
  };

  const handleAlertsClick = () => {
    if (user?.role === "buyer") {
      router.push("/buyer/alerts");
      return;
    }

    router.push("/login");
  };

  const featuredProperties = React.useMemo(() => allProperties.slice(0, 4), [allProperties]);

  const dashainOffers = React.useMemo(
    () =>
      allProperties
        .filter((item) => item.offerActive && item.offerCategory === "dashain")
        .slice(0, 6),
    [allProperties]
  );
  const hotDeals = React.useMemo(
    () =>
      allProperties.filter((item) => item.offerActive && item.offerCategory === "hot").slice(0, 6),
    [allProperties]
  );
  const latestDeals = React.useMemo(
    () =>
      allProperties
        .filter((item) => item.offerActive && item.offerCategory === "latest")
        .slice(0, 6),
    [allProperties]
  );
  const limitedTimeOffers = React.useMemo(
    () =>
      allProperties
        .filter((item) => item.offerActive && item.offerCategory === "limited_time")
        .slice(0, 6),
    [allProperties]
  );

  return (
    <div className="min-h-screen bg-white">
      <PublicSiteHeader />

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, #012C21 0%, #1DBF85 45%, #A5EFD1 100%)",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-black/10 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
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
              Discover your next chapter with us. Effortless, elegant, and exclusively yours.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={2}
              className="mt-10 max-w-xl rounded-2xl bg-white/90 p-4 shadow-xl ring-1 ring-white/30 backdrop-blur"
            >
              <div className="flex gap-2">
                <TabButton active={mode === "buy"} onClick={() => setMode("buy")}>
                  Buy
                </TabButton>
                <TabButton active={mode === "rent"} onClick={() => setMode("rent")}>
                  Rent
                </TabButton>
                <TabButton active={mode === "sell"} onClick={() => setMode("sell")}>
                  Sell
                </TabButton>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-emerald-100">
                  <Search className="h-4 w-4 text-emerald-600" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
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
                  onClick={handleSearch}
                  type="button"
                >
                  {mode === "sell" ? "Get Started" : "Search"}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Pill>Live Listings</Pill>
                <Pill>Direct Detail Pages</Pill>
                <Pill>Existing Buyer Flow</Pill>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={browseHref}
                  className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.98]"
                >
                  {mode === "rent"
                    ? "Browse Rentals"
                    : mode === "buy"
                      ? "Browse Properties"
                      : "Explore Listings"}
                </Link>
                <Link
                  href={addPropertyHref}
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50 active:scale-[0.98]"
                >
                  List Your Property
                </Link>
              </div>

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
                whileHover={{ scale: [1, 1.05, 1], y: [0, -6, 0] }}
                transition={{
                  duration: 1.4,
                  ease: "easeInOut",
                }}
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
          <p className="mt-3 text-center text-sm text-slate-500">Three steps. Three minutes.</p>

          <div className="mt-10 grid gap-4 md:grid-cols-5">
            <MiniCard icon={<Home className="h-5 w-5" />} title="Buy a Home" href="/properties?type=sale" />
            <MiniCard
              icon={<Building2 className="h-5 w-5" />}
              title="Rent a Home"
              href="/properties?type=rent"
            />
            <MiniCard icon={<BarChart3 className="h-5 w-5" />} title="Sell a Home" href={addPropertyHref} />
            <MiniCard icon={<Heart className="h-5 w-5" />} title="Offers" href="/properties?offersOnly=true" />
            <MiniCard icon={<Search className="h-5 w-5" />} title="All Listings" href="/properties" />
          </div>
        </div>
      </section>

      {featuredProperties.length > 0 ? (
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
                className="group inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
              >
                View All{" "}
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featuredProperties.map((p, i) => (
                <motion.div
                  key={p._id || p.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                >
                  <PropertyCard p={p} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <OfferSection
        title="Dashain Festival Offers"
        description="Seasonal picks curated from active Dashain promotions."
        href="/properties?offersOnly=true&category=dashain"
        items={dashainOffers}
      />

      <OfferSection
        title="Hot Deals"
        description="Listings getting the strongest spotlight right now."
        href="/properties?offersOnly=true&category=hot"
        items={hotDeals}
        tinted
      />

      <OfferSection
        title="Latest Deals"
        description="Freshly promoted properties with active deal tags."
        href="/properties?offersOnly=true&category=latest"
        items={latestDeals}
      />

      <OfferSection
        title="Limited Time Offers"
        description="Short-window promotions worth checking before they expire."
        href="/properties?offersOnly=true&category=limited_time"
        items={limitedTimeOffers}
        tinted
      />

      <section className="bg-emerald-50/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h3 className="text-center text-3xl font-extrabold tracking-tight text-slate-900">
            Your Partner in Finding a Home
          </h3>
          <p className="mt-2 text-center text-sm text-slate-500">
            We provide a complete service for the sale, purchase, or rental of real estate.
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
              href="/properties"
              className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.98]"
            >
              Browse Listings
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-r from-[#CFF9E8] via-[#8CF0C9] to-[#17D97B] py-16">
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: "radial-gradient(rgba(0,0,0,0.22) 1px, transparent 1px)",
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

            <p className="mt-2 text-xs text-emerald-950/60">No spam. Unsubscribe anytime.</p>
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
                <span className="text-sm font-bold text-emerald-950">Property Sewa</span>
              </div>
              <p className="mt-3 text-sm text-emerald-950/70">
                The modern way to find, buy, and sell your home.
              </p>
              <p className="mt-8 text-xs text-emerald-950/60">
                © {new Date().getFullYear()} Property Sewa. All rights reserved.
              </p>
            </div>

            <FooterCol
              title="Company"
              links={[
                { label: "Home", href: "/" },
                { label: "Login", href: "/login" },
                { label: "Register", href: "/register" },
                { label: "Admin Login", href: "/admin-login" },
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
    </div>
  );
}

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
      className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
    >
      {children}
    </button>
  );
}

function MiniCard({
  icon,
  title,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
}) {
  return (
    <Link href={href}>
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
    </Link>
  );
}

function PropertyCard({ p }: { p: Property }) {
  const href = p._id ? `/buyer/property/${p._id}` : "/properties";

  return (
    <Link href={href} className="group block">
      <motion.div
        whileHover={{ y: -8 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 hover:shadow-md"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={p.image}
            alt={p.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
          />
          <div className="absolute left-3 top-3 z-10">
            <OfferBadge
              category={p.offerCategory}
              active={p.offerActive}
              label={p.offerBadge || p.offerTitle}
            />
          </div>
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

function OfferSection({
  title,
  description,
  href,
  items,
  tinted = false,
}: {
  title: string;
  description: string;
  href: string;
  items: Property[];
  tinted?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section className={tinted ? "bg-emerald-50/35 py-20" : "bg-white py-20"}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>

          <Link
            href={href}
            className="group inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
          >
            View All
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {items.slice(0, 4).map((p, i) => (
            <motion.div
              key={p._id || p.id || `${title}-${i}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
            >
              <PropertyCard p={p} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
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
        {links.map((l) => (
          <li key={l.label}>
            <Link className="transition hover:text-emerald-950" href={l.href}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

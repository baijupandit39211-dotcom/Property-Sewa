"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import PublicSiteHeader from "@/components/public/PublicSiteHeader";
import SharedPropertyCard from "@/components/property/PropertyCard";
import { apiFetch, apiFetchSafe } from "@/app/lib/api";
import { getDashboardPath } from "@/app/lib/auth";
import type { Property as ListingProperty } from "@/app/lib/property.types";
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
  ChevronRight,
  BriefcaseBusiness,
  Building,
} from "lucide-react";

type Property = ListingProperty & {
  id?: string;
  image: string;
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
          price: Number(item.price || 0),
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
    <div className="min-h-screen bg-[#F7FCFA]">
      <PublicSiteHeader />

      <section className="relative overflow-hidden border-b border-[#E5E7EB]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(112deg, #0F5F42 0%, #22855F 41%, #91DDBE 73%, #DFF7EB 100%)",
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none opacity-[0.13]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3E%3Crect width='2' height='2' fill='rgba(255,255,255,0.62)'/%3E%3C/svg%3E\")",
            filter: "blur(0.45px)",
          }}
        />

        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_56%_46%,rgba(237,251,245,0.24)_0%,rgba(237,251,245,0.14)_24%,transparent_62%),radial-gradient(circle_at_82%_43%,rgba(255,255,255,0.14)_0%,transparent_56%)]" />

        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/6 to-transparent" />

        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-2 lg:gap-9 lg:py-14">
          <div>
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0}
              className="text-[64px] font-bold leading-[1.03] tracking-[-0.02em] text-white"
            >
              <span className="block whitespace-nowrap">The Modern Way to Find</span>
              <span className="mt-1 block text-center">Home</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
              className="mx-auto mt-3.5 max-w-[56ch] text-center text-[16px] leading-6 text-white/84"
            >
              Discover your next chapter with us. Effortless, elegant, and exclusively yours.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={2}
              className="mt-7 max-w-[640px] rounded-[30px] bg-white/92 p-3.5 shadow-[0_24px_48px_rgba(13,28,18,0.22)] ring-1 ring-white/65"
            >
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#D6DBD9] p-1.5">
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

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#D6DBD9] px-3.5 py-2.5">
                  <Search className="h-4 w-4 text-[#316249]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full bg-transparent text-sm text-[#4F7768] outline-none placeholder:text-[#4F7768]"
                    placeholder="Enter an address, neighborhood, city, or ZIP code"
                  />
                </div>

                <button
                  className={cn(
                    "rounded-xl px-6 py-2.5 text-sm font-semibold text-[#0D1C12]",
                    "bg-[#13EC80] hover:bg-[#10DD78]",
                    "shadow-sm shadow-[#13EC80]/12",
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

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={browseHref}
                  prefetch={true}
                  className="rounded-full bg-[#13EC80] px-8 py-3 text-base font-semibold text-[#0D1C12] shadow-sm shadow-[#13EC80]/20 transition hover:bg-[#10DD78] active:scale-[0.98]"
                >
                  {mode === "rent"
                    ? "Browse Rentals"
                    : mode === "buy"
                      ? "Browse Properties"
                      : "Explore Listings"}
                </Link>
                <Link
                  href={addPropertyHref}
                  prefetch={true}
                  className="rounded-full bg-white/35 px-8 py-3 text-base font-semibold text-white ring-1 ring-white/70 transition hover:bg-white/45 active:scale-[0.98]"
                >
                  List Your Property
                </Link>
              </div>

              <div className="mt-8 text-center text-base text-white/70">Explore Neighborhoods â†’</div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#13EC80]" />
                  Verified Listings
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#13EC80]" />
                  Secure Transactions
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#13EC80]" />
                  Top Agents
                </span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
            className="relative hidden lg:block"
          >
            <div className="relative ml-auto aspect-[1.08/1] w-full max-w-[560px] lg:translate-x-6">
              <motion.div
                whileHover={{ scale: [1, 1.02, 1], y: [0, -3, 0] }}
                transition={{ duration: 1.4, ease: "easeInOut" }}
                className="relative h-full w-full"
              >
                <Image
                  src="/house-3d.png"
                  alt="3D House"
                  fill
                  priority
                  className="object-contain brightness-[1.02] saturate-[0.92] drop-shadow-[0_18px_24px_rgba(13,28,18,0.18)]"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#F7FCFA] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center text-[30px] font-bold leading-[1.14] tracking-[-0.02em] text-[#111814] sm:text-[38px]"
          >
            Everything should be this easy.
          </motion.h2>
          <p className="mt-2 text-center text-sm text-[#618975]">Three steps. Three minutes.</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MiniCard
              icon={<Home className="h-4 w-4" />}
              title="Buy a Home"
              desc="Find your dream home from thousands of listings."
              href="/properties?type=sale"
            />
            <MiniCard
              icon={<Building2 className="h-4 w-4" />}
              title="Rent a Home"
              desc="Discover apartments, condos, and houses for rent."
              href="/properties?type=rent"
            />
            <MiniCard
              icon={<BarChart3 className="h-4 w-4" />}
              title="Sell a Home"
              desc="Get a free valuation and sell with top agents."
              href={addPropertyHref}
            />
            <MiniCard
              icon={<BriefcaseBusiness className="h-4 w-4" />}
              title="Commercial"
              desc="Explore office, retail, and industrial properties."
              href="/properties?type=commercial"
            />
            <MiniCard
              icon={<Building className="h-4 w-4" />}
              title="New Projects"
              desc="Be the first to know about new constructions."
              href="/properties?type=new-projects"
            />
          </div>
        </div>
      </section>

      {featuredProperties.length > 0 ? (
        <section className="bg-[#F7FCFA] pb-14 sm:pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div>
              <div>
                <h3 className="text-center text-[30px] font-bold leading-[1.14] tracking-[-0.02em] text-[#111814] sm:text-[38px]">
                  Featured Properties
                </h3>
                <p className="mt-2 text-center text-sm text-[#618975]">
                  Handpicked listings from the best locations, just for you.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex w-fit items-center gap-1 rounded-xl bg-[#E8EEEA] p-1 ring-1 ring-[#E2E8E5]">
                  <button
                    type="button"
                    className="rounded-lg bg-white px-4 py-1.5 text-xs font-medium text-[#111814] shadow-[0_1px_2px_rgba(17,24,20,0.08)]"
                  >
                    Popular
                  </button>
                  <button type="button" className="rounded-lg px-4 py-1.5 text-xs font-medium text-[#6F8F7F]">
                    Newest
                  </button>
                  <button type="button" className="rounded-lg px-4 py-1.5 text-xs font-medium text-[#6F8F7F]">
                    Price
                  </button>
                </div>

                <Link
                  href="/properties"
                  prefetch={true}
                  className="group inline-flex items-center gap-2 self-end text-sm font-semibold text-[#13EC80] transition hover:text-[#0D1C12] sm:self-auto"
                >
                  View All
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {featuredProperties.map((p, i) => (
                <motion.div
                  key={p._id || p.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                >
                  <SharedPropertyCard
                    property={p}
                    variant="featured"
                    href={p._id ? `/buyer/property/${p._id}` : "/properties"}
                    onToggleWishlist={() => {}}
                    onToggleCompare={() => {}}
                    showFeaturedBadge
                    viewLabel="View Listing"
                  />
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

      <section className="bg-[#EEF8EB] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h3 className="text-center text-3xl font-bold tracking-tight text-[#111814]">
            Your Partner in Finding a Home
          </h3>
          <p className="mt-2 text-center text-sm text-[#618975]">
            We provide a complete service for the sale, purchase, or rental of real estate.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
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
              prefetch={true}
              className="rounded-full bg-[#316249] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-[#316249]/30 transition hover:bg-[#24472E] active:scale-[0.98]"
            >
              Browse Listings
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-r from-[#F7FCFA] via-[#EEF8EB] to-[#DCEFD9] py-12 sm:py-14">
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage: "radial-gradient(rgba(49,98,73,0.14) 0.8px, transparent 0.8px)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h3 className="text-3xl font-bold tracking-tight text-[#102219]">
              Get Property Alerts
            </h3>
            <p className="mt-2 text-sm text-[#102219]/70">
              Be the first to know about new listings that match your criteria.
            </p>

            <div className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row">
              <input
                className="h-12 flex-1 rounded-2xl bg-white px-4 text-sm text-[#0D1C12] outline-none ring-1 ring-[#D1D5DB] placeholder:text-[#618975]"
                placeholder="Enter your email address"
              />
              <button
                type="button"
                onClick={handleAlertsClick}
                className="h-12 rounded-2xl bg-[#316249] px-5 text-sm font-semibold text-white transition hover:bg-[#24472E] active:scale-[0.98]"
              >
                Get Alerts
              </button>
            </div>

            <p className="mt-2 text-xs text-[#102219]/60">No spam. Unsubscribe anytime.</p>
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
                className="object-contain drop-shadow-[0_18px_18px_rgba(13,28,18,0.18)]"
              />
            </motion.div>
          </div>
        </div>

        <div className="relative mx-auto mt-12 max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 border-t border-[#102219]/15 pt-10 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#102219]/10 ring-1 ring-[#102219]/15">
                  <Home className="h-5 w-5 text-[#102219]" />
                </div>
                <span className="text-sm font-bold text-[#102219]">Property Sewa</span>
              </div>
              <p className="mt-3 text-sm text-[#102219]/70">
                The modern way to find, buy, and sell your home.
              </p>
              <p className="mt-8 text-xs text-[#102219]/60">
                Â© {new Date().getFullYear()} Property Sewa. All rights reserved.
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
          ? "bg-[#316249] text-white shadow shadow-[#316249]/25"
          : "bg-[#E8F2EB] text-[#1A3321] ring-1 ring-[#CFE8D6] hover:bg-[#DDEAE3]"
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
      className="rounded-full bg-[#F0F4F2] px-4 py-2 text-xs font-semibold text-[#2C3F35] transition hover:bg-[#E5E7EB]"
    >
      {children}
    </button>
  );
}

function MiniCard({
  icon,
  title,
  desc,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link href={href} prefetch={true}>
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 240, damping: 16 }}
        className="min-h-[168px] rounded-[16px] border border-[#E5E7EB] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(17,24,20,0.08)] transition hover:shadow-[0_10px_28px_rgba(17,24,20,0.12)]"
      >
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#D7F1E4] text-[#13EC80]">
          {icon}
        </div>
        <p className="mt-4 text-lg font-bold leading-5 text-[#111814]">{title}</p>
        <p className="mt-2 text-xs leading-[1.45] text-[#618975]">{desc}</p>
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
    <section className={tinted ? "bg-[#EEF8EB]/55 py-14 sm:py-16" : "bg-[#F7FCFA] py-14 sm:py-16"}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-[#111814]">{title}</h3>
            <p className="mt-1 text-sm text-[#618975]">{description}</p>
          </div>

          <Link
            href={href}
            prefetch={true}
            className="group inline-flex items-center gap-2 text-sm font-semibold text-[#316249] transition hover:text-[#0D1C12]"
          >
            View All
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 4).map((p, i) => (
            <motion.div
              key={p._id || p.id || `${title}-${i}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
            >
              <SharedPropertyCard
                property={p}
                variant="featured"
                href={p._id ? `/buyer/property/${p._id}` : "/properties"}
                onToggleWishlist={() => {}}
                onToggleCompare={() => {}}
                showFeaturedBadge
                viewLabel="View Listing"
              />
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
      className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#E5E7EB] hover:shadow-md"
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E8F2EB] text-[#316249] ring-1 ring-[#D1D5DB]">
        {icon}
      </div>
      <p className="mt-3 text-sm font-extrabold text-[#111814]">{title}</p>
      <p className="mt-1 text-sm text-[#618975]">{desc}</p>
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
      <p className="text-sm font-extrabold text-[#102219]">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-[#102219]/70">
        {links.map((l) => (
          <li key={l.label}>
            <Link className="transition hover:text-[#102219]" href={l.href} prefetch={true}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}


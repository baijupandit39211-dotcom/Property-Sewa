"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bath,
  Bell,
  BookmarkCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  Compass,
  Heart,
  MapPin,
  Ruler,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { typography } from "../../lib/typography";
import type { Property } from "../../lib/property.types";
import AdActionsMenu from "@/app/property/[id]/_components/AdActionsMenu";

const BRAND = "#1f6b58";

export function Toast({ show, text }: { show: boolean; text: string }) {
  return (
    <div
      className={[
        "fixed right-6 top-6 z-[9999] transition-all duration-200",
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      ].join(" ")}
    >
      <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-white/10">
        {text}
      </div>
    </div>
  );
}

export function PageSearchBar({
  searchText,
  setSearchText,
  userName,
  wishlistCount,
}: {
  searchText: string;
  setSearchText: React.Dispatch<React.SetStateAction<string>>;
  userName: string;
  wishlistCount: number;
}) {
  const searchHref = searchText.trim()
    ? `/buyer/search-properties?q=${encodeURIComponent(searchText.trim())}`
    : "/buyer/search-properties";

  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.035)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <label className="flex h-14 flex-1 items-center gap-3 rounded-full border border-[#ece8e0] bg-[#fbfaf7] px-5">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search location, city, or property type..."
            className={`w-full bg-transparent outline-none ${typography.inputText}`}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <TopRoundIcon href="/buyer/notifications" icon={<Bell className="h-4 w-4" />} />
          <TopRoundIcon href="/buyer/wishlist" icon={<Heart className="h-4 w-4" />} />
          <Link
            href={searchHref}
            className={`inline-flex h-11 items-center rounded-full border border-[#d7ddd4] bg-white px-4 text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm ${typography.buttonText}`}
          >
            Search
          </Link>
          <div className="flex items-center gap-3 rounded-full border border-[#e1e4df] bg-white px-3 py-1.5 shadow-sm">
            <span
              className="grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: BRAND }}
            >
              {firstName(userName).slice(0, 1).toUpperCase()}
            </span>
            <div className="pr-2">
              <p className={typography.profileName}>{userName}</p>
              <p className={typography.profileMeta}>Buyer</p>
            </div>
          </div>
          <div className={`rounded-full bg-[#eff4f1] px-4 py-2 text-[#0d5c45] ${typography.buttonText}`}>
            {wishlistCount} saved
          </div>
        </div>
      </div>
    </div>
  );
}

function TopRoundIcon({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="grid h-11 w-11 place-items-center rounded-full border border-[#d9dfd8] bg-white text-slate-600 transition hover:-translate-y-0.5 hover:shadow-sm"
    >
      {icon}
    </Link>
  );
}

export function OverviewCard({
  icon,
  label,
  value,
  meta,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  meta: string;
  accent: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      className="rounded-[24px] border border-[#ece8e0] bg-white p-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]"
    >
      <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ backgroundColor: accent }}>
        {icon}
      </div>
      <p className={`mt-5 ${typography.cardTitle}`}>{label}</p>
      <div className={`mt-2 ${typography.statValue}`}>{value}</div>
      <p className={`mt-1 ${typography.helperText}`}>{meta}</p>
    </motion.div>
  );
}

export function DiscoveryCard({ property }: { property: Property | null }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#ece8e0] bg-[linear-gradient(135deg,#eef3f1_0%,#f8f7f4_45%,#eef3f1_100%)] p-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(31,107,88,0.08),transparent_28%),radial-gradient(circle_at_70%_30%,rgba(31,107,88,0.06),transparent_24%)]" />
      <div className="relative flex h-full items-center justify-between gap-4">
        <div className="max-w-[180px]">
          <p className={typography.pageEyebrow}>Market Spotlight</p>
          <h3 className={`mt-3 ${typography.sectionTitle}`}>{property?.title || "Luxury Buyer Match"}</h3>
          <p className={`mt-2 ${typography.pageSubtitle}`}>
            {property?.location || "A curated property snapshot is ready for you."}
          </p>
        </div>

        <div className="relative mx-auto h-[150px] w-[200px] max-w-full rounded-[26px] bg-white/70 p-3 shadow-[0_20px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="absolute -left-3 top-8 h-4 w-4 rounded-full bg-[#1f6b58] shadow-sm" />
          <div className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white text-rose-500 shadow-sm">
            <Heart className="h-4 w-4 fill-rose-500" />
          </div>
          <div className="h-full overflow-hidden rounded-[20px]">
            <img
              src={
                property?.images?.[0]?.url ||
                fallbackImage({ title: "Luxury Buyer Match", location: "Property Sewa" } as Property)
              }
              alt={property?.title || "Luxury property"}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  actionHref,
  actionText,
}: {
  title: string;
  actionHref: string;
  actionText: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className={typography.sectionTitle}>{title}</h2>
      <Link
        href={actionHref}
        className={`inline-flex items-center gap-2 text-[#1f6b58] transition hover:opacity-80 ${typography.buttonText}`}
      >
        {actionText}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function RecommendationCard({
  property,
  label,
  wishSaved,
  wishPop,
  onToggleWish,
  compareOn,
  comparePop,
  onToggleCompare,
  onReport,
}: {
  property: Property;
  label: string;
  wishSaved: boolean;
  wishPop: boolean;
  onToggleWish: () => void;
  compareOn: boolean;
  comparePop: boolean;
  onToggleCompare: () => void;
  onReport: (input: { adId?: string | null; title?: string; location?: string }) => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden rounded-[24px] border border-[#ece8e0] bg-white shadow-[0_14px_28px_rgba(15,23,42,0.04)]"
    >
      <div className="relative h-[190px] overflow-hidden bg-slate-100">
        <img
          src={property.images?.[0]?.url || fallbackImage(property)}
          alt={property.title}
          className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900 shadow-sm">
          {label}
        </div>
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleWish();
            }}
            className={[
              "grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm transition",
              wishPop ? "scale-110" : "",
            ].join(" ")}
          >
            <Heart className={["h-4 w-4", wishSaved ? "fill-rose-500 text-rose-500" : ""].join(" ")} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className={typography.statValue}>{formatPrice(property)}</div>
        <Link href={`/buyer/property/${property._id}`} className="mt-2 block text-sm font-medium text-slate-900">
          {property.title}
        </Link>
        <div className={`mt-2 flex items-center gap-1 ${typography.helperText}`}>
          <MapPin className="h-3.5 w-3.5 text-rose-400" />
          {property.location || property.address}
        </div>
        <div className={`mt-4 flex flex-wrap gap-3 ${typography.helperText}`}>
          <InlineSpec icon={<Compass className="h-3.5 w-3.5" />} text={`${property.beds || 0} Beds`} />
          <InlineSpec icon={<Bath className="h-3.5 w-3.5" />} text={`${property.baths || 0} Baths`} />
          <InlineSpec icon={<Ruler className="h-3.5 w-3.5" />} text={`${numberCompact(property.sqft)} sqft`} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onToggleCompare}
            className={[
              `inline-flex h-9 items-center rounded-full px-3 transition ${typography.buttonText}`,
              compareOn ? "bg-slate-900 text-white" : "border border-[#dfe5df] bg-white text-slate-700",
              comparePop ? "scale-105" : "",
            ].join(" ")}
          >
            Compare
          </button>
          <div
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <AdActionsMenu
              adId={property._id}
              title={property.title}
              location={property.location || property.address}
              variant="icon"
              onReport={onReport}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SavedPropertyCard({
  property,
  wishSaved,
  wishPop,
  onToggleWish,
  compareOn,
  comparePop,
  onToggleCompare,
  onReport,
}: {
  property: Property;
  wishSaved: boolean;
  wishPop: boolean;
  onToggleWish: () => void;
  compareOn: boolean;
  comparePop: boolean;
  onToggleCompare: () => void;
  onReport: (input: { adId?: string | null; title?: string; location?: string }) => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden rounded-[24px] border border-[#ece8e0] bg-white shadow-[0_14px_28px_rgba(15,23,42,0.04)]"
    >
      <div className="relative h-[170px] overflow-hidden bg-slate-100">
        <img
          src={property.images?.[0]?.url || fallbackImage(property)}
          alt={property.title}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleWish();
          }}
          className={[
            "absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm transition",
            wishPop ? "scale-110" : "",
          ].join(" ")}
        >
          <Heart className={["h-4 w-4", wishSaved ? "fill-rose-500 text-rose-500" : ""].join(" ")} />
        </button>
      </div>

      <div className="p-4">
        <div className={typography.statValue}>{formatPrice(property)}</div>
        <Link href={`/buyer/property/${property._id}`} className="mt-2 block text-sm font-medium text-slate-900">
          {property.title}
        </Link>
        <div className={`mt-2 ${typography.pageSubtitle}`}>{property.location || property.address}</div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggleCompare}
            className={[
              `inline-flex h-9 items-center rounded-full px-3 transition ${typography.buttonText}`,
              compareOn ? "bg-slate-900 text-white" : "border border-[#dfe5df] bg-white text-slate-700",
              comparePop ? "scale-105" : "",
            ].join(" ")}
          >
            Compare
          </button>
          <div
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <AdActionsMenu
              adId={property._id}
              title={property.title}
              location={property.location || property.address}
              variant="icon"
              onReport={onReport}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function InlineSpec({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <span className="inline-flex items-center gap-1.5">{icon}{text}</span>;
}

export function BudgetOverviewCard({
  budget,
}: {
  budget: { current: number; target: number; percent: number };
}) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={typography.sectionTitle}>Budget Overview</h3>
          <p className={`mt-1 ${typography.helperText}`}>Set your preferred range</p>
          <div className="mt-6 text-2xl font-semibold tracking-tight text-[#1f6b58] md:text-3xl">
            {formatCompactCurrency(budget.current)}
          </div>
          <p className={`mt-2 ${typography.helperText}`}>of {formatCompactCurrency(budget.target)}</p>
        </div>

        <div
          className="grid h-24 w-24 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${BRAND} 0 ${budget.percent}%, #d9e6df ${budget.percent}% 100%)`,
          }}
        >
          <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white text-xl font-semibold text-slate-900">
            {budget.percent}%
          </div>
        </div>
      </div>

      <Link
        href="/buyer/profile"
        className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-2xl text-white transition hover:-translate-y-0.5 ${typography.buttonText}`}
        style={{ backgroundColor: BRAND }}
      >
        Edit Budget
      </Link>
    </div>
  );
}

export function UpcomingVisitsCard({ items }: { items: Property[] }) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <h3 className={typography.sectionTitle}>Upcoming Visits</h3>
        <Link href="/buyer/search-properties" className={`text-[#1f6b58] ${typography.buttonText}`}>
          View all
        </Link>
      </div>

      <div className="mt-5 space-y-4">
        {items.length ? (
          items.map((property, index) => (
            <Link
              key={property._id}
              href={`/buyer/property/${property._id}`}
              className="flex items-center gap-4 rounded-[22px] border border-[#ece8e0] bg-[#fbfaf7] p-3 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
            >
              <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
                <img
                  src={property.images?.[0]?.url || fallbackImage(property)}
                  alt={property.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{property.title}</p>
                <p className={`mt-1 ${typography.pageSubtitle}`}>{property.location || property.address}</p>
                <div className={`mt-2 flex items-center gap-2 ${typography.helperText}`}>
                  <CalendarDays className="h-3.5 w-3.5 text-rose-400" />
                  {derivedVisitDate(index)}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <EmptyState message="Upcoming property visits will appear here." />
        )}
      </div>
    </div>
  );
}

export function MessagesCard({
  items,
}: {
  items: Array<{ sender: string; body: string; time: string }>;
}) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <h3 className={typography.sectionTitle}>Messages</h3>
        <Link href="/buyer/messages" className={`text-[#1f6b58] ${typography.buttonText}`}>
          View all
        </Link>
      </div>

      <div className="mt-5 space-y-4">
        {items.map((item, index) => (
          <Link
            key={`${item.sender}-${index}`}
            href="/buyer/messages"
            className="flex items-start gap-4 rounded-[22px] border border-[#ece8e0] bg-[#fbfaf7] p-3 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
          >
            <div
              className="grid h-12 w-12 place-items-center rounded-full text-white"
              style={{ backgroundColor: index === 2 ? BRAND : "#d8e6df" }}
            >
              {index === 2 ? (
                <BookmarkCheck className="h-5 w-5" />
              ) : (
                <UserRound className="h-5 w-5 text-[#1f6b58]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-900">{item.sender}</p>
                <span className={`shrink-0 ${typography.helperText}`}>{item.time}</span>
              </div>
              <p className={`mt-2 line-clamp-2 ${typography.pageSubtitle}`}>{item.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function RecentSearchesCard({ searches }: { searches: string[] }) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <h3 className={typography.sectionTitle}>Recent Searches</h3>
        <button className={typography.buttonTextMuted}>Clear all</button>
      </div>

      <div className="mt-5 space-y-3">
        {searches.length ? (
          searches.map((search) => (
            <Link
              key={search}
              href={`/buyer/search-properties?q=${encodeURIComponent(search)}`}
              className={`flex items-center gap-3 rounded-full border border-[#ece8e0] bg-[#fbfaf7] px-4 py-3 text-slate-700 transition hover:bg-white hover:shadow-sm ${typography.buttonTextMuted}`}
            >
              <Clock3 className="h-4 w-4 text-[#7f8a84]" />
              {search}
            </Link>
          ))
        ) : (
          <EmptyState message="Search history will appear here once you explore listings." />
        )}
      </div>
    </div>
  );
}

export function LiveActivityCard({
  items,
}: {
  items: Array<{ label: string; text: string }>;
}) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
      <h3 className={typography.sectionTitle}>Live Activity</h3>

      <div className="mt-5 space-y-5">
        {items.map((item, index) => (
          <div key={item.label} className="relative pl-11">
            {index !== items.length - 1 ? (
              <span className="absolute left-[14px] top-8 h-[calc(100%-8px)] w-px bg-[#d9e3dc]" />
            ) : null}
            <span className="absolute left-0 top-0 grid h-7 w-7 place-items-center rounded-full bg-[#edf5f0] text-[#1f6b58]">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <p className={typography.pageEyebrow}>{item.label}</p>
            <p className={`mt-1.5 ${typography.pageSubtitle}`}>{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#d9dfd8] bg-[#faf8f4] px-5 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "Buyer";
}

function numberCompact(value: number) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

function formatCompactCurrency(value: number) {
  if (!value) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 100_000) return `Rs. ${(value / 100_000).toFixed(1)} L`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPrice(property: Property) {
  const currency = property.currency || "USD";
  const price = Number(property.price) || 0;
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

function derivedVisitDate(index: number) {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + index + 2);
  return next.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fallbackImage(property: Property) {
  const title = property.title || property.location || "Luxury Estate";
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#eef3f1"/>
          <stop offset="100%" stop-color="#dfe8e1"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#g)"/>
      <text x="50%" y="48%" text-anchor="middle" fill="#0f172a" font-family="Arial, sans-serif" font-size="56" font-weight="700">${title}</text>
      <text x="50%" y="57%" text-anchor="middle" fill="#1f6b58" font-family="Arial, sans-serif" font-size="24" letter-spacing="6">PROPERTY SEWA</text>
    </svg>`
  )}`;
}

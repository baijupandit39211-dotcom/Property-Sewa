"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bath, BedDouble, MapPin, Search, Square, ArrowRight } from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import OfferBadge from "@/components/offers/OfferBadge";

type Property = {
  _id: string;
  title: string;
  price: number;
  currency?: string;
  location?: string;
  address?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  listingType?: string;
  images?: { url: string }[];
  offerCategory?: "none" | "dashain" | "latest" | "hot" | "limited_time";
  offerBadge?: string;
  offerTitle?: string;
  offerActive?: boolean;
};

type ListResponse = {
  items: Property[];
  total?: number;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function normalizeListingType(value: string | null) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "sale" || normalized === "buy") return "buy";
  if (normalized === "rent") return "rent";
  return "";
}

function pageCopy(listingType: string) {
  if (listingType === "buy") {
    return {
      badge: "For Sale",
      title: "Properties for sale",
      description: "Browse sale listings and open any property to view the full details page.",
    };
  }

  if (listingType === "rent") {
    return {
      badge: "For Rent",
      title: "Properties for rent",
      description: "Browse rental listings and open any property to view the full details page.",
    };
  }

  return {
    badge: "All Listings",
    title: "Property listings",
    description: "Browse the latest available listings and open any property for full details.",
  };
}

export default function PublicPropertiesPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const searchParam = searchParams.get("search") || "";
  const offersOnlyParam = searchParams.get("offersOnly");
  const initialListingType = React.useMemo(
    () => normalizeListingType(typeParam),
    [typeParam]
  );
  const initialOffersOnly =
    offersOnlyParam === "true" || offersOnlyParam === "1" || offersOnlyParam === "yes";

  const [listingType, setListingType] = React.useState(initialListingType);
  const [search, setSearch] = React.useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [showOnlyOffers, setShowOnlyOffers] = React.useState(initialOffersOnly);
  const [items, setItems] = React.useState<Property[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setListingType(initialListingType);
  }, [initialListingType]);

  React.useEffect(() => {
    setSearch(searchParam);
    setDebouncedSearch(searchParam);
  }, [searchParam]);

  React.useEffect(() => {
    setShowOnlyOffers(initialOffersOnly);
  }, [initialOffersOnly]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set("limit", "24");
    params.set("sort", "latest");
    if (listingType) params.set("listingType", listingType);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (showOnlyOffers) params.set("offersOnly", "true");

    setLoading(true);
    setError("");

    apiFetch<ListResponse>(`/properties?${params.toString()}`)
      .then((res) => setItems(res.items || []))
      .catch((err: any) => {
        setItems([]);
        setError(err?.message || "Failed to load properties");
      })
      .finally(() => setLoading(false));
  }, [listingType, debouncedSearch, showOnlyOffers]);

  const copy = pageCopy(listingType);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.18),transparent_26%),linear-gradient(180deg,#f8fffb_0%,#eefbf4_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-7 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                {copy.badge}
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                {copy.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                Back to Home
              </Link>
              <Link
                href="/buyer/search-properties"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
              >
                Advanced Search
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/properties?type=sale"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  listingType === "buy"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
                )}
              >
                For Sale
              </Link>
              <Link
                href="/properties?type=rent"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  listingType === "rent"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
                )}
              >
                For Rent
              </Link>
              <Link
                href="/properties"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  listingType === ""
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100"
                )}
              >
                All
              </Link>
              <button
                type="button"
                onClick={() => setShowOnlyOffers((value) => !value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  showOnlyOffers
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
                )}
              >
                Offers Only
              </button>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, address, or location"
                className="w-full rounded-2xl border border-emerald-100 bg-[#f9fffb] py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-[28px] border border-rose-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-bold text-rose-700">{error}</h2>
            <p className="mt-2 text-sm text-slate-500">Please refresh or try another filter.</p>
          </section>
        ) : loading ? (
          <section className="rounded-[28px] border border-emerald-100 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Loading listings...</h2>
            <p className="mt-2 text-sm text-slate-500">Fetching the latest properties.</p>
          </section>
        ) : items.length === 0 ? (
          <section className="rounded-[28px] border border-emerald-100 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">No properties found</h2>
            <p className="mt-2 text-sm text-slate-500">
              Try a different search or switch between sale and rent listings.
            </p>
          </section>
        ) : (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((property) => (
              <Link
                key={property._id}
                href={`/buyer/property/${property._id}`}
                className="group overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_40px_-26px_rgba(16,185,129,0.24)]"
              >
                <div className="relative">
                  <img
                    src={property.images?.[0]?.url || "/placeholder.jpg"}
                    alt={property.title || "Property"}
                    className="h-[230px] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute left-4 top-4">
                    <OfferBadge
                      category={property.offerCategory}
                      active={property.offerActive}
                      label={property.offerBadge || property.offerTitle}
                    />
                  </div>
                  <div className="absolute bottom-4 right-4 rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800 shadow-sm">
                    {String(property.listingType || "").toLowerCase() === "rent" ? "For Rent" : "For Sale"}
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Price
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                      {property.currency || "NPR"} {Number(property.price || 0).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <h2 className="line-clamp-2 text-lg font-bold leading-6 text-slate-900">
                      {property.title}
                    </h2>
                    <p className="mt-2 flex items-start gap-2 text-sm text-slate-500">
                      <MapPin className="mt-0.5 h-4 w-4 flex-none text-emerald-700" />
                      <span>{property.address || property.location || "Location unavailable"}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 ring-1 ring-emerald-100">
                      <BedDouble className="h-3.5 w-3.5 text-emerald-700" />
                      {property.beds || 0} Beds
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 ring-1 ring-emerald-100">
                      <Bath className="h-3.5 w-3.5 text-emerald-700" />
                      {property.baths || 0} Baths
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 ring-1 ring-emerald-100">
                      <Square className="h-3.5 w-3.5 text-emerald-700" />
                      {property.sqft || 0} sqft
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

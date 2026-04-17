"use client";

import Link from "next/link";
import {
  Bath,
  BedDouble,
  Heart,
  MapPin,
  MoveDiagonal2,
  Scale,
  ShieldCheck,
} from "lucide-react";
import type { Property } from "@/app/lib/property.types";
import OfferBadge from "@/components/offers/OfferBadge";

export type PropertyCardOfferExpiry = {
  text: string;
  tone: "emerald" | "amber" | "rose";
};

type Props = {
  property: Property;
  saved: boolean;
  compareOn: boolean;
  heartPop: boolean;
  scalePop: boolean;
  offerExpiry: PropertyCardOfferExpiry | null;
  isOfferActive: (property: Property) => boolean;
  toggleWishlist: (id: string) => void;
  toggleCompare: (id: string) => void;
};

function getPrimaryImage(property: Property) {
  return (
    property.images?.[0]?.url ||
    "https://placehold.co/900x700/e8f5ee/0f172a?text=Property+Sewa"
  );
}

function getCardTypeLabel(property: Property) {
  const title = String(property.title || "").toLowerCase();

  if (title.includes("villa")) return "Villa";
  if (title.includes("apartment")) return "Apartment";
  if (title.includes("house")) return "House";
  if (title.includes("flat")) return "Flat";
  if (title.includes("land")) return "Land";

  return "Property";
}

function getListingBadgeLabel(property: Property) {
  const rawType = String((property as any).listingType || "").toLowerCase();
  if (rawType === "rent") return "For Rent";
  if (rawType === "buy" || rawType === "sale") return "For Buy";
  return "Featured";
}

function formatCardArea(property: Property) {
  if (typeof property.sqft === "number" && property.sqft > 0) {
    return `${property.sqft} sqft`;
  }

  return "Area on request";
}

function getDiscountBadgeLabel(property: Property) {
  const isActive =
    property.offerActive === true ||
    String(property.offerActive).toLowerCase() === "true";

  if (!isActive) return "";

  const discountType = String(property.offerDiscountType || "").toLowerCase();
  const discountValue = Number(property.offerDiscountValue || 0);

  if (!(discountValue > 0)) return "";

  if (discountType === "percentage") {
    return `${discountValue}% OFF`;
  }

  if (discountType === "fixed") {
    return `${property.currency || "NPR"} ${discountValue.toLocaleString()} OFF`;
  }

  return "";
}

export default function PropertyCard({
  property,
  saved,
  compareOn,
  heartPop,
  scalePop,
  offerExpiry,
  isOfferActive,
  toggleWishlist,
  toggleCompare,
}: Props) {
  const cardType = getCardTypeLabel(property);
  const listingBadgeLabel = getListingBadgeLabel(property);
  const cardArea = formatCardArea(property);
  const discountBadgeLabel = getDiscountBadgeLabel(property);

  return (
    <article
      className="group overflow-hidden rounded-[30px] border border-slate-200/85 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)] transition-all duration-300 will-change-transform [transform:translateZ(0)] hover:-translate-y-1.5 hover:border-emerald-200 hover:shadow-[0_30px_90px_rgba(16,185,129,0.14)]"
      style={{ contentVisibility: "auto", containIntrinsicSize: "520px" }}
    >
      <div className="relative flex h-full flex-col">
        <button
          type="button"
          onClick={() => toggleCompare(property._id)}
          className={[
            "absolute right-[4.25rem] top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full shadow-sm ring-1 backdrop-blur transition-all duration-200 active:scale-95",
            compareOn
              ? "bg-slate-900 text-white ring-slate-900"
              : "bg-white/92 text-slate-700 ring-black/5 hover:bg-white hover:shadow-md",
            scalePop ? "scale-105" : "",
          ].join(" ")}
          aria-label={compareOn ? "Remove from compare" : "Add to compare"}
          title={compareOn ? "Remove from compare" : "Add to compare"}
        >
          <Scale className={["h-[15px] w-[15px] transition-transform duration-200", scalePop ? "scale-110" : ""].join(" ")} />
        </button>

        <button
          type="button"
          onClick={() => toggleWishlist(property._id)}
          className={[
            "absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full shadow-sm ring-1 backdrop-blur transition-all duration-200 active:scale-95",
            saved
              ? "bg-emerald-600 text-white ring-emerald-600"
              : "bg-white/92 text-slate-700 ring-black/5 hover:bg-white hover:shadow-md",
            heartPop ? "scale-110" : "",
          ].join(" ")}
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          title={saved ? "Saved" : "Save"}
        >
          <Heart
            className={[
                "h-[18px] w-[18px] transition-transform duration-200",
              saved ? "fill-white" : "",
              heartPop ? "scale-110" : "",
            ].join(" ")}
          />
        </button>

        <Link href={`/buyer/property/${property._id}`} className="block h-full">
          <div className="relative overflow-hidden">
            <img
              src={getPrimaryImage(property)}
              alt={property.title ?? "Property image"}
              loading="lazy"
              decoding="async"
              className="h-[290px] w-full object-cover transition-transform duration-500 ease-out [transform:translateZ(0)] group-hover:scale-[1.045] sm:h-[320px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-950/8 to-transparent" />

            <div className="absolute left-4 top-4 z-20 flex translate-y-0 flex-col gap-2 transition-transform duration-300 group-hover:-translate-y-0.5">
              <span className="inline-flex min-h-[34px] items-center rounded-full bg-[#F4A100] px-4 text-xs font-extrabold uppercase tracking-[0.08em] text-white shadow-sm">
                Featured
              </span>
              <span className="inline-flex min-h-[34px] items-center rounded-full bg-[#0E9F6E] px-4 text-xs font-extrabold uppercase tracking-[0.08em] text-white shadow-sm">
                {listingBadgeLabel}
              </span>
              {discountBadgeLabel ? (
                <span className="inline-flex min-h-[34px] items-center rounded-full bg-white/92 px-4 text-xs font-extrabold uppercase tracking-[0.08em] text-rose-600 shadow-sm">
                  {discountBadgeLabel}
                </span>
              ) : null}
            </div>

            {isOfferActive(property) ? (
              <div className="absolute left-4 top-[8.1rem] z-20 hidden transition-transform duration-300 group-hover:-translate-y-0.5 sm:block">
                <OfferBadge
                  category={property.offerCategory}
                  active={isOfferActive(property)}
                  label={property.offerBadge || property.offerTitle}
                />
              </div>
            ) : null}

            <div className="absolute bottom-5 left-4 z-20 transition-transform duration-300 group-hover:-translate-y-0.5">
              <div className="rounded-[22px] bg-white/96 px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Price
                </p>
                <p className="mt-1 text-[1.55rem] font-black tracking-tight text-emerald-600 sm:text-[1.7rem]">
                  {property.currency} {Number(property.price || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col bg-white">
            <div className="space-y-5 px-6 pb-6 pt-7">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-emerald-700 sm:text-[13px]">
                  {cardType}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[#245BFF] sm:text-[13px]">
                  <ShieldCheck className="h-[14px] w-[14px]" />
                  Verified
                </span>
              </div>

              <div>
                <h3 className="line-clamp-2 text-[1.45rem] font-extrabold leading-[1.22] tracking-tight text-emerald-700 sm:text-[1.6rem]">
                  {property.title || "Property listing"}
                </h3>
                <p className="mt-3 flex items-center gap-2 text-[14px] text-slate-500 sm:text-[15px]">
                  <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="truncate">{property.address || property.location}</span>
                </p>
              </div>

              {offerExpiry ? (
                <div
                  className={[
                    "inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1",
                    offerExpiry.tone === "emerald"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : offerExpiry.tone === "amber"
                        ? "bg-amber-50 text-amber-700 ring-amber-200"
                        : "bg-rose-50 text-rose-700 ring-rose-200",
                  ].join(" ")}
                >
                  {offerExpiry.text}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-3 border-y border-slate-200/80 bg-slate-50/40">
              <div className="flex flex-col items-center justify-center gap-3 px-3 py-5 text-center">
                <BedDouble className="h-[18px] w-[18px] text-slate-400 transition-colors duration-300 group-hover:text-emerald-500" strokeWidth={1.8} />
                <div>
                  <p className="text-[1.05rem] font-extrabold tracking-tight text-slate-900">
                    {property.beds}
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-600">Beds</p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-3 border-x border-slate-200/80 px-3 py-5 text-center">
                <Bath className="h-[18px] w-[18px] text-slate-400 transition-colors duration-300 group-hover:text-emerald-500" strokeWidth={1.8} />
                <div>
                  <p className="text-[1.05rem] font-extrabold tracking-tight text-slate-900">
                    {property.baths}
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-600">Baths</p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-3 px-3 py-5 text-center">
                <MoveDiagonal2 className="h-[18px] w-[18px] text-slate-400 transition-colors duration-300 group-hover:text-emerald-500" strokeWidth={1.8} />
                <div>
                  <p className="text-[1.05rem] font-extrabold tracking-tight text-slate-900">
                    {cardArea.replace(" sqft", "")}
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-600">
                    {cardArea.includes("sqft") ? "Sqft" : "Area"}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="flex items-center justify-center rounded-full border-2 border-emerald-600 px-5 py-3 text-center text-[15px] font-bold text-emerald-700 transition-all duration-300 group-hover:border-emerald-700 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-[0_14px_30px_rgba(16,185,129,0.25)] sm:text-[16px]">
                View Details
              </div>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}

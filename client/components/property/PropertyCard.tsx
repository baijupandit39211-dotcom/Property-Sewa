"use client";

import Link from "next/link";
import { Bath, BedDouble, Heart, MapPin, MoveDiagonal2, Scale } from "lucide-react";
import type { Property } from "@/app/lib/property.types";
import OfferBadge from "@/components/offers/OfferBadge";

export type PropertyCardOfferExpiry = {
  text: string;
  tone: "emerald" | "amber" | "rose";
};

type Props = {
  property: Property;
  saved?: boolean;
  compareOn?: boolean;
  heartPop?: boolean;
  scalePop?: boolean;
  comparePop?: boolean;
  offerExpiry?: PropertyCardOfferExpiry | null;
  isOfferActive?: (property: Property) => boolean;
  toggleWishlist?: ((id: string) => void) | (() => void);
  toggleCompare?: ((id: string) => void) | (() => void);
  onToggleWishlist?: ((id: string) => void) | (() => void);
  onToggleCompare?: ((id: string) => void) | (() => void);
  variant?: "default" | "compact" | "featured" | string;
  showFeaturedBadge?: boolean;
  href?: string;
  onRemove?: () => void;
  secondaryAction?: {
    href: string;
    label: string;
    icon?: React.ReactNode;
  };
  viewLabel?: string;
};

function getPrimaryImage(property: Property) {
  return property.images?.[0]?.url || "https://placehold.co/900x700/e8f5ee/0f172a?text=Property+Sewa";
}

function getListingBadgeLabel(property: Property) {
  const rawType = String((property as any).listingType || "").toLowerCase();
  if (rawType === "rent") return "For Rent";
  if (rawType === "buy" || rawType === "sale") return "For Sale";
  return "Featured";
}

function formatCardArea(property: Property) {
  if (typeof property.sqft === "number" && property.sqft >= 100) return `${property.sqft} sqft`;
  return "Area on request";
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatNpr(value: number) {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getDiscountBadgeLabel(property: Property) {
  const isActive = property.offerActive === true || String(property.offerActive).toLowerCase() === "true";
  if (!isActive) return "";

  const discountType = String(property.offerDiscountType || "").toLowerCase();
  const discountValue = Number(property.offerDiscountValue || 0);
  if (!(discountValue > 0)) return "";

  if (discountType === "percentage") return `${discountValue}% OFF`;
  if (discountType === "fixed") return `NPR ${discountValue.toLocaleString()} OFF`;
  return "";
}

export default function PropertyCard({
  property,
  saved = false,
  compareOn = false,
  heartPop = false,
  scalePop = false,
  comparePop = false,
  offerExpiry = null,
  isOfferActive = () => false,
  toggleWishlist,
  toggleCompare,
  onToggleWishlist,
  onToggleCompare,
  href,
  variant = "default",
  showFeaturedBadge = true,
}: Props) {
  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";
  const comparePulse = scalePop || comparePop;

  const handleWishlistToggle = () => {
    const fn = (onToggleWishlist || toggleWishlist) as ((id: string) => void) | undefined;
    if (fn) fn(property._id);
  };

  const handleCompareToggle = () => {
    const fn = (onToggleCompare || toggleCompare) as ((id: string) => void) | undefined;
    if (fn) fn(property._id);
  };

  const listingBadgeLabel = getListingBadgeLabel(property);
  const cardArea = formatCardArea(property);
  const discountBadgeLabel = getDiscountBadgeLabel(property);
  const displayTitle = toTitleCase(property.title || "Property Listing");
  const displayPrice = formatNpr(Number(property.price || 0)).replace("NPR", "").trim();

  return (
    <article className="group mx-auto w-full max-w-[440px] overflow-hidden rounded-[28px] border border-[#e7ece8] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.14)]">
      <div className="relative">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleCompareToggle();
          }}
          className={[
            "absolute right-[5.25rem] top-5 z-20 inline-flex size-11 items-center justify-center rounded-full bg-white/90 text-[#1f2937] shadow-md backdrop-blur-md transition-all duration-200 active:scale-95",
            compareOn ? "bg-[#316249] text-white" : "hover:bg-[#316249] hover:text-white",
            comparePulse ? "scale-105" : "",
          ].join(" ")}
          aria-label={compareOn ? "Remove from compare" : "Add to compare"}
          title={compareOn ? "Remove from compare" : "Add to compare"}
        >
          <Scale className={["h-[18px] w-[18px] transition-transform duration-200", comparePulse ? "scale-110" : ""].join(" ")} />
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleWishlistToggle();
          }}
          className={[
            "absolute right-5 top-5 z-20 grid size-11 place-items-center rounded-full bg-white/90 text-[#1f2937] shadow-md backdrop-blur-md transition-all duration-200 active:scale-95",
            saved ? "bg-[#316249] text-white" : "hover:bg-[#316249] hover:text-white",
            heartPop ? "scale-110" : "",
          ].join(" ")}
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          title={saved ? "Saved" : "Save"}
        >
          <Heart
            className={[
              "h-[18px] w-[18px] transition-transform duration-200",
              saved ? "fill-current" : "",
              heartPop ? "scale-110" : "",
            ].join(" ")}
          />
        </button>

        <Link href={href || `/buyer/property/${property._id}`} className="block">
          <div className="relative aspect-[16/10] overflow-hidden rounded-t-[28px]">
            <img
              src={getPrimaryImage(property)}
              alt={property.title ?? "Property image"}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
                isCompact ? "min-h-[210px]" : isFeatured ? "min-h-[245px]" : "min-h-[260px]"
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

            <div className="absolute left-5 top-5 z-20 flex items-center gap-2">
              {showFeaturedBadge ? (
                <span className="inline-flex h-7 items-center rounded-full bg-[#eef7f1] px-3 text-[12px] font-medium leading-none text-[#316249]">
                  Featured
                </span>
              ) : null}
              <span className="inline-flex h-7 items-center rounded-full border border-white/60 bg-white/90 px-3 text-[12px] font-medium leading-none text-[#1f2937]">
                {listingBadgeLabel}
              </span>
              {discountBadgeLabel ? (
                <span className="inline-flex h-7 items-center rounded-full bg-[#fff1f2] px-3 text-[12px] font-medium leading-none text-[#e11d48]">
                  {discountBadgeLabel}
                </span>
              ) : null}
            </div>

            {isOfferActive(property) ? (
              <div className="absolute left-3 top-14 z-20 hidden sm:block">
                <OfferBadge
                  category={property.offerCategory}
                  active={isOfferActive(property)}
                  label={property.offerBadge || property.offerTitle}
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className={`line-clamp-1 text-left font-semibold tracking-tight text-[#111827] ${isCompact ? "text-[18px] leading-6" : "text-[20px] leading-7"}`}>
                {displayTitle}
              </h3>
              <span className="inline-flex h-9 shrink-0 items-center rounded-full border border-[#dfe7e2] bg-[#f3f7f4] px-4 text-[14px] font-semibold text-[#111827] transition-colors duration-300 group-hover:bg-[#eef6f0]">
                NPR {displayPrice}
              </span>
            </div>

            <p className={`mt-1 flex items-center gap-2 line-clamp-1 text-[15px] font-medium text-neutral-500 ${isCompact ? "text-[14px]" : ""}`}>
              <MapPin className="h-4 w-4 shrink-0 text-neutral-500" />
              <span className="truncate">{property.address || property.location}</span>
            </p>

            {offerExpiry ? (
              <div
                className={[
                  "mt-3 inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1",
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

          <div className={`grid grid-cols-3 gap-3 border-t border-[#e5e7eb] bg-white ${isCompact ? "px-4 pb-4 pt-3" : "px-5 pb-4 pt-4"}`}>
            <div className="px-1">
              <div className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#f7f8f7] px-2.5 text-[13px] font-medium text-[#374151]">
                <BedDouble className="h-4 w-4 text-[#4b5563]" />
                {property.beds || 0} bd
              </div>
            </div>
            <div className="px-1">
              <div className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#f7f8f7] px-2.5 text-[13px] font-medium text-[#374151]">
                <Bath className="h-4 w-4 text-[#4b5563]" />
                {property.baths || 0} ba
              </div>
            </div>
            <div className="px-1">
              <div className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#f7f8f7] px-2.5 text-[13px] font-medium text-[#374151]">
                <MoveDiagonal2 className="h-4 w-4 text-[#4b5563]" />
                {cardArea}
              </div>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}

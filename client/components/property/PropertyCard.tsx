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
  const showDiscountBadge = Boolean(discountBadgeLabel) && !isCompact;

  return (
    <article className={`group mx-auto w-full overflow-hidden rounded-[28px] border border-[#e7ece8] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.14)] ${isCompact ? "max-w-[420px]" : "max-w-[440px]"}`}>
      <div className="relative">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleCompareToggle();
          }}
          className={[
            `absolute ${isCompact ? "right-[4.5rem]" : "right-[5.25rem]"} top-5 z-20 inline-flex ${isCompact ? "size-10" : "size-11"} items-center justify-center rounded-full bg-white/90 text-[#1f2937] shadow-[0_4px_14px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-200 active:scale-95`,
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
            `absolute right-5 top-5 z-20 grid ${isCompact ? "size-10" : "size-11"} place-items-center rounded-full bg-white/90 text-[#1f2937] shadow-[0_4px_14px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-200 active:scale-95`,
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
                isCompact ? "min-h-[195px]" : isFeatured ? "min-h-[245px]" : "min-h-[260px]"
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

            <div className="absolute left-5 top-5 right-28 z-20 flex flex-wrap items-center gap-2">
              {showFeaturedBadge ? (
                <span className="inline-flex h-7 items-center rounded-full border border-white/50 bg-white/95 px-3 text-[12px] font-medium leading-none text-[#316249] shadow-sm backdrop-blur-md">
                  Featured
                </span>
              ) : null}
              <span className="inline-flex h-7 items-center rounded-full border border-white/50 bg-white/95 px-3 text-[12px] font-medium leading-none text-[#1f2937] shadow-sm backdrop-blur-md">
                {listingBadgeLabel}
              </span>
              {showDiscountBadge ? (
                <span className="inline-flex h-7 items-center rounded-full border border-white/50 bg-white/95 px-3 text-[12px] font-medium leading-none text-[#e11d48] shadow-sm backdrop-blur-md">
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

          <div className={`flex flex-col gap-3.5 ${isCompact ? "px-5 pt-5 pb-4" : "p-5"}`}>
            <div className="flex items-center justify-between gap-4">
              <h3 className={`min-w-0 flex-1 text-left font-semibold tracking-tight text-[#111827] ${isCompact ? "line-clamp-2 min-h-[52px] text-[18px] leading-6" : "line-clamp-1 text-[20px] leading-7"}`}>
                {displayTitle}
              </h3>
              <span className={`inline-flex shrink-0 items-center rounded-full border border-[#d7e2db] bg-[#f4f7f4] font-semibold text-[#111827] transition-colors duration-300 group-hover:bg-[#eef6f0] ${isCompact ? "h-8 px-3 text-[12.5px]" : "h-9 px-4 text-[13.5px]"}`}>
                NPR {displayPrice}
              </span>
            </div>

            <p className={`mt-1.5 flex items-center line-clamp-1 font-medium text-neutral-600 ${isCompact ? "gap-1.5 text-[14px]" : "gap-2 text-[15px]"}`}>
              <MapPin className="h-4 w-4 shrink-0 text-[#111827]" />
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

          <div className={`grid grid-cols-3 gap-2.5 border-t border-[#e5e7eb] bg-white ${isCompact ? "mt-3 px-5 pb-4 pt-3" : "px-5 pb-4 pt-4"}`}>
            <div>
              <div className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#f6f7f6] text-[#374151] ${isCompact ? "h-8 px-2.5 text-[12.5px]" : "h-9 px-2 text-[13px]"} font-medium`}>
                <BedDouble className={`${isCompact ? "h-[15px] w-[15px]" : "h-4 w-4"} text-[#111827]`} />
                {property.beds || 0} bd
              </div>
            </div>
            <div>
              <div className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#f6f7f6] text-[#374151] ${isCompact ? "h-8 px-2.5 text-[12.5px]" : "h-9 px-2 text-[13px]"} font-medium`}>
                <Bath className={`${isCompact ? "h-[15px] w-[15px]" : "h-4 w-4"} text-[#111827]`} />
                {property.baths || 0} ba
              </div>
            </div>
            <div>
              <div className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#f6f7f6] text-[#374151] ${isCompact ? "h-8 px-2.5 text-[12.5px]" : "h-9 px-2 text-[13px]"} font-medium`}>
                <MoveDiagonal2 className={`${isCompact ? "h-[15px] w-[15px]" : "h-4 w-4"} text-[#111827]`} />
                {cardArea}
              </div>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}

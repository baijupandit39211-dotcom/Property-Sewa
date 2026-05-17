"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, MapPin, MessageCircle, X } from "lucide-react";
import type { Property } from "@/app/lib/property.types";

type Theme = {
  primary: string;
  text: string;
  textSoft: string;
  border: string;
};

export default function ComparePropertyPanel({
  property,
  saved,
  theme,
  messageHref,
  onSave,
  onRemove,
}: {
  property: Property;
  saved: boolean;
  theme: Theme;
  messageHref: string;
  onSave: () => void;
  onRemove: () => void;
}) {
  const image = property.images?.[0]?.url || "/placeholder-property.jpg";
  const price = `${property.currency || "NPR"} ${(Number(property.price) || 0).toLocaleString()}`;
  const location = property.address || property.location || "-";

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden rounded-[28px] border bg-white shadow-sm"
      style={{ borderColor: "#D1D5DB" }}
    >
      <div className="relative h-[260px] overflow-hidden">
        <img src={image} alt={property.title || "Property image"} loading="lazy" decoding="async" className="h-full w-full object-cover" />

        <button
          type="button"
          onClick={onSave}
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition"
          style={{
            backgroundColor: saved ? theme.primary : "rgba(255,255,255,0.95)",
            color: saved ? "#fff" : theme.text,
          }}
        >
          <Heart className={["h-3.5 w-3.5", saved ? "fill-white" : ""].join(" ")} />
          {saved ? "Saved" : "Save"}
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-xl border bg-white/95"
          style={{ borderColor: "#E5E7EB", color: theme.text }}
          title="Remove from compare"
          aria-label="Remove from compare"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <div className="text-3xl font-semibold leading-none" style={{ color: theme.text }}>
            {price}
          </div>
          <p className="mt-2 text-lg font-semibold leading-7" style={{ color: theme.text }}>
            {property.title}
          </p>
          <div className="mt-2 flex items-center gap-1 text-sm leading-6" style={{ color: theme.textSoft }}>
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[`${property.beds ?? "-"} Beds`, `${property.baths ?? "-"} Baths`, `${property.sqft ?? "-"} Sqft`].map((item) => (
            <span key={item} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: "#EEF8EB", color: "#274f3a" }}>
              {item}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href={`/buyer/property/${property._id}`} className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white" style={{ backgroundColor: theme.primary }}>
            View Listing
          </Link>

          <Link
            href={messageHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition"
            style={{ borderColor: theme.border, backgroundColor: "#fff", color: theme.text }}
          >
            <MessageCircle className="h-4 w-4" />
            Contact Seller
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

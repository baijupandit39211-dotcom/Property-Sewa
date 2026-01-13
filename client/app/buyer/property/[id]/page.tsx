"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import BuyerHeader from "../../../../components/buyer/BuyerHeader";
import BuyerSidebar from "../../../../components/buyer/BuyerSidebar";
import { apiFetch } from "../../../lib/api";
import type { Property } from "../../../lib/property.types";

export default function PropertyDetailsPage() {
  const params = useParams<{ id?: string }>();
  const id = useMemo(() => (params?.id ? String(params.id) : ""), [params]);

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    setLoading(true);

    apiFetch<{ success: boolean; property: Property }>(`/properties/${id}`)
      .then((res) => setProperty(res.property))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-emerald-50">
      <BuyerHeader />

      <div className="flex">
        <BuyerSidebar />

        <main className="w-full px-10 py-8">
          {loading && (
            <div className="rounded-2xl bg-white p-6 text-sm text-zinc-600 ring-1 ring-black/5">
              Loading property...
            </div>
          )}

          {!loading && !property && (
            <div className="rounded-2xl bg-white p-6 text-sm text-red-600 ring-1 ring-black/5">
              Property not found.
            </div>
          )}

          {property && (
            <>
              {/* top action buttons */}
              <div className="flex justify-end gap-3">
                <button className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white">
                  Add to Wishlist
                </button>
                <button className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white">
                  Share
                </button>
              </div>

              {/* banner image */}
              <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    property.images?.[0]?.url ||
                    "https://via.placeholder.com/1200x600?text=No+Image"
                  }
                  alt={property.title}
                  className="h-[240px] w-full object-cover"
                />
              </div>

              {/* title + price */}
              <h1 className="mt-8 text-3xl font-extrabold text-zinc-900">
                {property.title}
              </h1>

              <div className="mt-2 text-2xl font-extrabold text-emerald-700">
                {property.currency} {Number(property.price).toLocaleString()}
              </div>

              <div className="mt-2 text-sm text-emerald-700">
                {property.beds} Beds · {property.baths} Baths · {property.sqft} sqft
              </div>

              <div className="mt-2 text-sm text-zinc-600">
                {property.address || property.location}
              </div>

              <p className="mt-6 max-w-[760px] text-sm leading-6 text-zinc-700">
                {property.description || "No description provided."}
              </p>

              {/* tabs (UI only for now) */}
              <div className="mt-6 flex flex-wrap gap-6 border-b border-emerald-200 text-sm">
                <button className="border-b-2 border-emerald-700 pb-3 font-semibold text-emerald-900">
                  Overview
                </button>
                <button className="pb-3 text-emerald-700 hover:text-emerald-900">
                  Amenities & Floor Plans
                </button>
                <button className="pb-3 text-emerald-700 hover:text-emerald-900">
                  Photos
                </button>
                <button className="pb-3 text-emerald-700 hover:text-emerald-900">
                  Location & Insights
                </button>

                <div className="ml-auto flex gap-3 pb-3">
                  <button className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white">
                    Schedule Visit
                  </button>
                  <button className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-black/5 hover:bg-emerald-50">
                    Contact Agent
                  </button>
                </div>
              </div>

              {/* Similar properties can come later */}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

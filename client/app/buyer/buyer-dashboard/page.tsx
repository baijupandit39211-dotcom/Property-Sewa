"use client";

import { useEffect, useState } from "react";
import BuyerHeader from "../../../components/buyer/BuyerHeader";
import BuyerSidebar from "../../../components/buyer/BuyerSidebar";
import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";

type ListResponse = {
  success: boolean;
  items: Property[];
};

export default function BuyerDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    apiFetch<ListResponse>("/properties?limit=8")
      .then((res) => setProperties(res.items))
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-emerald-50">
      <BuyerHeader />

      <div className="flex">
        <BuyerSidebar />

        <main className="w-full px-10 py-8">
          <h1 className="text-4xl font-extrabold text-zinc-900">
            Recommended Properties
          </h1>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {properties.map((p) => (
              <a
                key={p._id}
                href={`/buyer/property/${p._id}`}
                className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 hover:shadow-md"
              >
                <img
                  src={p.images[0]?.url}
                  alt={p.title}
                  className="h-[140px] w-full rounded-2xl object-cover"
                />

                <div className="p-4">
                  <div className="text-sm font-semibold text-zinc-900">
                    {p.title}
                  </div>

                  <div className="mt-1 font-bold text-emerald-700">
                    {p.currency} {p.price.toLocaleString()}
                  </div>

                  <div className="mt-2 text-xs text-emerald-700">
                    {p.beds} Beds · {p.baths} Baths · {p.sqft} sqft
                  </div>

                  <div className="mt-1 text-xs text-zinc-600">
                    {p.location}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import BuyerHeader from "../../../components/buyer/BuyerHeader";
import BuyerSidebar from "../../../components/buyer/BuyerSidebar";
import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";

type ListResponse = {
  items: Property[];
};

export default function SearchPropertiesPage() {
  const [items, setItems] = useState<Property[]>([]);

  useEffect(() => {
    apiFetch<ListResponse>("/properties")
      .then((res) => setItems(res.items))
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-emerald-50">
      <BuyerHeader />

      <div className="flex">
        <BuyerSidebar />

        <main className="w-full px-10 py-8">
          <h1 className="text-3xl font-extrabold">Search Results</h1>

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {items.map((p) => (
              <a
                key={p._id}
                href={`/buyer/property/${p._id}`}
                className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 hover:shadow-md"
              >
                <img
                  src={p.images[0]?.url}
                  className="h-[120px] w-full rounded-2xl object-cover"
                />

                <div className="p-4">
                  <div className="font-bold">
                    {p.currency} {p.price.toLocaleString()}
                  </div>

                  <div className="mt-1 text-xs text-emerald-700">
                    {p.beds} Beds · {p.baths} Baths · {p.sqft} sqft
                  </div>

                  <div className="mt-2 text-xs text-zinc-600">
                    {p.address || p.location}
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

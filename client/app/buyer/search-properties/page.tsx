"use client";

import { useEffect, useState } from "react";
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
    <main className="w-full min-w-0 px-10 py-8">
      <h1 className="text-3xl font-extrabold text-slate-900">Search Results</h1>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <a
            key={p._id}
            href={`/buyer/property/${p._id}`}
            className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 hover:shadow-md"
          >
            <img
              src={p.images[0]?.url}
              alt={p.title ?? "Property image"}
              className="h-[120px] w-full object-cover"
            />

            <div className="p-4">
              <div className="font-bold text-slate-900">
                {p.currency} {Number(p.price || 0).toLocaleString()}
              </div>

              <div className="mt-1 text-xs font-semibold text-emerald-700">
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
  );
}

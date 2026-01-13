"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Property = {
  _id: string;
  title: string;
  location: string;
  price: number;
  currency: string;
  status: string;
  createdAt: string;
  images: { url: string }[];
};

export default function ListingsApprovalPage() {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: Property[] }>("/properties/admin/pending");
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    await apiFetch(`/properties/admin/${id}/approve`, { method: "PATCH" });
    await load();
  }

  async function reject(id: string) {
    await apiFetch(`/properties/admin/${id}/reject`, { method: "PATCH" });
    await load();
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-4xl font-extrabold text-zinc-900">Listings Approval</h1>

      {loading ? (
        <div className="mt-6 text-sm text-zinc-600">Loading...</div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50">
              <tr>
                <th className="px-4 py-3 text-left">Preview</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {items.map((p) => (
                <tr key={p._id} className="border-t">
                  <td className="px-4 py-3">
                    <img
                      src={p.images?.[0]?.url}
                      alt="preview"
                      className="h-12 w-16 rounded-lg object-cover"
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold">{p.title}</td>
                  <td className="px-4 py-3">{p.location}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">
                    {p.currency} {p.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-600 px-3 py-1 text-xs text-white">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(p._id)}
                        className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-bold text-white"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reject(p._id)}
                        className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                    No pending listings ✅
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

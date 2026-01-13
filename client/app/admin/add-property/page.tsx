"use client";

import { useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

export default function AddPropertyPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      const res = await fetch(`${API_BASE}/properties`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create");

      setMsg("✅ Property created (Pending). Now approve it in Listings Approval.");
      form.reset();
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-emerald-50 p-8">
      <h1 className="text-3xl font-extrabold text-zinc-900">Add Property</h1>
      <p className="mt-2 text-sm text-emerald-700">
        Fill all details (these will appear in Buyer Property Details page)
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-3xl space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
      >
        {/* Title */}
        <div>
          <label className="text-sm font-semibold">Title</label>
          <input
            name="title"
            required
            className="mt-2 w-full rounded-xl border px-4 py-2"
            placeholder="Modern 3-Bedroom House"
          />
        </div>

        {/* Description ✅ NEW */}
        <div>
          <label className="text-sm font-semibold">Description</label>
          <textarea
            name="description"
            rows={4}
            className="mt-2 w-full rounded-xl border px-4 py-2"
            placeholder="Write details about this property..."
          />
        </div>

        {/* Price + Currency */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold">Price</label>
            <input
              name="price"
              required
              type="number"
              min="1"
              className="mt-2 w-full rounded-xl border px-4 py-2"
              placeholder="12500000"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Currency</label>
            <select
              name="currency"
              className="mt-2 w-full rounded-xl border px-4 py-2"
              defaultValue="NPR"
            >
              <option value="NPR">NPR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        {/* Location + Address */}
        <div>
          <label className="text-sm font-semibold">Location</label>
          <input
            name="location"
            required
            className="mt-2 w-full rounded-xl border px-4 py-2"
            placeholder="Kathmandu, Nepal"
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Address (optional)</label>
          <input
            name="address"
            className="mt-2 w-full rounded-xl border px-4 py-2"
            placeholder="Baneshwor, Kathmandu"
          />
        </div>

        {/* Beds Baths Sqft */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold">Beds</label>
            <input
              name="beds"
              type="number"
              min="0"
              className="mt-2 w-full rounded-xl border px-4 py-2"
              defaultValue={3}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Baths</label>
            <input
              name="baths"
              type="number"
              min="0"
              className="mt-2 w-full rounded-xl border px-4 py-2"
              defaultValue={2}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Sqft</label>
            <input
              name="sqft"
              type="number"
              min="0"
              className="mt-2 w-full rounded-xl border px-4 py-2"
              defaultValue={1800}
            />
          </div>
        </div>

        {/* Property Type + Listing Type */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold">Property Type</label>
            <select
              name="propertyType"
              className="mt-2 w-full rounded-xl border px-4 py-2"
              defaultValue="house"
            >
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="condo">Condo</option>
              <option value="land">Land</option>
              <option value="office">Office</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">Listing Type</label>
            <select
              name="listingType"
              className="mt-2 w-full rounded-xl border px-4 py-2"
              defaultValue="buy"
            >
              <option value="buy">Buy</option>
              <option value="rent">Rent</option>
            </select>
          </div>
        </div>

        {/* Images */}
        <div>
          <label className="text-sm font-semibold">Images</label>
          <input
            name="images"
            type="file"
            accept="image/*"
            multiple
            required
            className="mt-2 w-full rounded-xl border bg-white px-4 py-2"
          />
          <p className="mt-1 text-xs text-zinc-500">Upload up to 6 images</p>
        </div>

        <button
          disabled={loading}
          className="w-full rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {loading ? "Uploading..." : "Create Property"}
        </button>

        {msg && (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-zinc-800">
            {msg}
          </div>
        )}
      </form>
    </div>
  );
}

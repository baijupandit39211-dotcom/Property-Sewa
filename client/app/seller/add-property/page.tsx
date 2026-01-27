"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { X, Star, UploadCloud } from "lucide-react";

const MAX_IMAGES = 6;

const AMENITIES = [
  "Parking",
  "Water",
  "Electricity Backup",
  "Security",
  "Lift",
  "Wifi",
  "AC",
  "Balcony",
  "Garden",
  "Gym",
] as const;

type Amenity = (typeof AMENITIES)[number];

export default function SellerAddPropertyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ keep your original fields
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    currency: "USD",
    location: "",
    address: "",
    beds: "",
    baths: "",
    sqft: "",
    propertyType: "house",
    listingType: "buy",

    // ✅ extra fields (optional)
    furnishing: "unfurnished", // unfurnished | semi | full
    availabilityDate: "", // YYYY-MM-DD
    monthlyRent: "", // rent only
    deposit: "", // rent only

    // ✅ NEW: advance/booking amount (optional)
    advanceAmount: "",

    yearBuilt: "",
    floor: "",
    totalFloors: "",
    facing: "east", // east|west|north|south
    roadAccessFt: "",
    landmark: "",
  });

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [coverIndex, setCoverIndex] = useState<number>(0);

  // ✅ previews (object URLs)
  const previews = useMemo(() => {
    return images.map((f) => URL.createObjectURL(f));
  }, [images]);

  // ✅ prevent memory leak: revoke on unmount / images change
  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previews]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleAmenity = (a: Amenity) => {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const clampCoverIndex = (len: number, nextIndex: number) => {
    if (len <= 0) return 0;
    if (nextIndex < 0) return 0;
    if (nextIndex >= len) return 0;
    return nextIndex;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const picked = Array.from(e.target.files);

    // limit to 6 total
    const combined = [...images, ...picked].slice(0, MAX_IMAGES);
    setImages(combined);

    // keep coverIndex valid
    setCoverIndex((prev) => clampCoverIndex(combined.length, prev));

    // reset input so selecting the same file again works
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);

      setCoverIndex((current) => {
        if (next.length === 0) return 0;
        if (idx === current) return 0;
        if (idx < current) return clampCoverIndex(next.length, current - 1);
        return clampCoverIndex(next.length, current);
      });

      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (images.length === 0) {
        setError("Please select at least 1 image.");
        setLoading(false);
        return;
      }

      const formDataToSend = new FormData();

      // ✅ append original + extra fields (only if not empty)
      Object.entries(formData).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined) return;
        formDataToSend.append(key, value);
      });

      // numeric safety
      formDataToSend.set("price", String(Number(formData.price || 0)));
      formDataToSend.set("beds", String(Number(formData.beds || 0)));
      formDataToSend.set("baths", String(Number(formData.baths || 0)));
      formDataToSend.set("sqft", String(Number(formData.sqft || 0)));

      // ✅ NEW numeric safety: advance amount
      // If your backend doesn't have this field yet, it will ignore it (or you can remove this line).
      formDataToSend.set("advanceAmount", String(Number(formData.advanceAmount || 0)));

      // rent-only numeric safety (optional)
      if (formData.listingType === "rent") {
        formDataToSend.set("monthlyRent", String(Number(formData.monthlyRent || 0)));
        formDataToSend.set("deposit", String(Number(formData.deposit || 0)));
      }

      // ✅ amenities as JSON string
      if (amenities.length > 0) {
        formDataToSend.set("amenities", JSON.stringify(amenities));
      }

      // cover index
      formDataToSend.set("coverIndex", String(clampCoverIndex(images.length, coverIndex)));

      // ✅ images (cover image will be first in order)
      const ordered = images.slice();
      const safeCover = clampCoverIndex(ordered.length, coverIndex);

      const cover = ordered.splice(safeCover, 1)[0];
      const finalImages = cover ? [cover, ...ordered] : ordered;

      finalImages.forEach((image) => formDataToSend.append("images", image));

      const response = await apiFetch<{ success: boolean; property: any }>(
        "/properties",
        { method: "POST", body: formDataToSend }
      );

      if (response?.success) {
        router.push("/seller/my-properties");
      } else {
        setError("Failed to create property");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create property");
    } finally {
      setLoading(false);
    }
  };

  const isRent = formData.listingType === "rent";

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-slate-200 bg-white/75 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                Add Property
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Create a new listing (images, details, amenities).
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Back
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7"
        >
          {/* Basic */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-800">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="e.g., Modern Family House"
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>

            {/* Price / Currency / Advance */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-slate-800">
                  Price *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  disabled={loading}
                  className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800">
                  Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                >
                  <option value="USD">USD</option>
                  <option value="NPR">NPR</option>
                  <option value="INR">INR</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800">
                  Advance Amount
                </label>
                <input
                  type="number"
                  name="advanceAmount"
                  value={formData.advanceAmount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  disabled={loading}
                  placeholder="e.g., 5000"
                  className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Amount buyer pays to book (optional).
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-slate-800">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              disabled={loading}
              placeholder="Write key highlights: rooms, condition, nearby areas, etc."
              className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
            />
          </div>

          {/* Location */}
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-800">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="e.g., Kathmandu, Nepal"
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={loading}
                placeholder="Full address (optional)"
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Specs */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800">Beds</label>
              <input
                type="number"
                name="beds"
                value={formData.beds}
                onChange={handleChange}
                min="0"
                disabled={loading}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800">Baths</label>
              <input
                type="number"
                name="baths"
                value={formData.baths}
                onChange={handleChange}
                min="0"
                disabled={loading}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800">Sqft</label>
              <input
                type="number"
                name="sqft"
                value={formData.sqft}
                onChange={handleChange}
                min="0"
                disabled={loading}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800">
                Property Type
              </label>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                disabled={loading}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              >
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="condo">Condo</option>
                <option value="land">Land</option>
              </select>
            </div>
          </div>

          {/* Listing Type + Furnishing */}
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-800">
                Listing Type
              </label>
              <select
                name="listingType"
                value={formData.listingType}
                onChange={handleChange}
                disabled={loading}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              >
                <option value="buy">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800">
                Furnishing
              </label>
              <select
                name="furnishing"
                value={formData.furnishing}
                onChange={handleChange}
                disabled={loading}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              >
                <option value="unfurnished">Unfurnished</option>
                <option value="semi">Semi Furnished</option>
                <option value="full">Fully Furnished</option>
              </select>
            </div>
          </div>

          {/* Rent-only */}
          {isRent && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="mb-3 text-sm font-semibold text-emerald-900">
                Rent Details
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Monthly Rent
                  </label>
                  <input
                    type="number"
                    name="monthlyRent"
                    value={formData.monthlyRent}
                    onChange={handleChange}
                    min="0"
                    disabled={loading}
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Deposit
                  </label>
                  <input
                    type="number"
                    name="deposit"
                    value={formData.deposit}
                    onChange={handleChange}
                    min="0"
                    disabled={loading}
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Availability Date
                  </label>
                  <input
                    type="date"
                    name="availabilityDate"
                    value={formData.availabilityDate}
                    onChange={handleChange}
                    disabled={loading}
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Extra details */}
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-slate-800">
                Year Built
              </label>
              <input
                type="number"
                name="yearBuilt"
                value={formData.yearBuilt}
                onChange={handleChange}
                min="0"
                disabled={loading}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800">Floor</label>
              <input
                type="number"
                name="floor"
                value={formData.floor}
                onChange={handleChange}
                min="0"
                disabled={loading}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800">
                Total Floors
              </label>
              <input
                type="number"
                name="totalFloors"
                value={formData.totalFloors}
                onChange={handleChange}
                min="0"
                disabled={loading}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-slate-800">Facing</label>
              <select
                name="facing"
                value={formData.facing}
                onChange={handleChange}
                disabled={loading}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              >
                <option value="east">East</option>
                <option value="west">West</option>
                <option value="north">North</option>
                <option value="south">South</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800">
                Road Access (ft)
              </label>
              <input
                type="number"
                name="roadAccessFt"
                value={formData.roadAccessFt}
                onChange={handleChange}
                min="0"
                disabled={loading}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800">
                Landmark (optional)
              </label>
              <input
                type="text"
                name="landmark"
                value={formData.landmark}
                onChange={handleChange}
                disabled={loading}
                placeholder="e.g., near City Mall"
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Amenities */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-800">
                Amenities
              </label>
              <span className="text-xs text-slate-500">
                {amenities.length} selected
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {AMENITIES.map((a) => {
                const active = amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    disabled={loading}
                    className={[
                      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      active
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-100"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      loading ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Images */}
          <div className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800">
                  Images * (up to {MAX_IMAGES})
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Select a cover image (shown first to buyers).
                </p>
              </div>
              <div className="text-xs text-slate-500">
                {images.length}/{MAX_IMAGES}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-4">
              <label className="group relative flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/30">
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-5 w-5" />
                  <span className="font-semibold">Upload images</span>
                  <span className="text-slate-500">(JPG/PNG)</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={loading || images.length >= MAX_IMAGES}
                  className="hidden"
                />
              </label>

              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {previews.map((src, idx) => (
                    <div
                      key={`${src}-${idx}`}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`upload-${idx}`}
                        className="h-28 w-full object-cover"
                      />

                      {/* cover badge */}
                      <button
                        type="button"
                        onClick={() => setCoverIndex(idx)}
                        disabled={loading}
                        className={[
                          "absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold shadow-sm transition",
                          idx === coverIndex
                            ? "bg-emerald-600 text-white"
                            : "bg-white/90 text-slate-800 hover:bg-white",
                        ].join(" ")}
                        title="Set as cover"
                      >
                        <Star className="h-3 w-3" />
                        {idx === coverIndex ? "Cover" : "Set"}
                      </button>

                      {/* remove */}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        disabled={loading}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-90 hover:bg-black/75"
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Property"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

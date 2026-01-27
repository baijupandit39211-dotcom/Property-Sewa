"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { Upload, X, CheckCircle2 } from "lucide-react";

const MAX_IMAGES = 6;

export default function AdminAddPropertyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ✅ NEW: store created property so we can show it after submit
  const [createdProperty, setCreatedProperty] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    currency: "NPR",
    location: "",
    address: "",
    beds: "",
    baths: "",
    sqft: "",
    propertyType: "house",
    listingType: "buy",
  });

  const [images, setImages] = useState<File[]>([]);

  // ✅ Better previews (and cleanup)
  const previews = useMemo(() => images.map((f) => URL.createObjectURL(f)), [images]);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files].slice(0, MAX_IMAGES));
    e.target.value = ""; // allow selecting same file again
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");
    setCreatedProperty(null);

    try {
      if (images.length === 0) {
        setError(`Please upload at least 1 image (max ${MAX_IMAGES}).`);
        setLoading(false);
        return;
      }

      const fd = new FormData();

      // text fields
      Object.entries(formData).forEach(([key, value]) => {
        fd.append(key, value);
      });

      // ✅ numeric safety
      fd.set("price", String(Number(formData.price || 0)));
      fd.set("beds", String(Number(formData.beds || 0)));
      fd.set("baths", String(Number(formData.baths || 0)));
      fd.set("sqft", String(Number(formData.sqft || 0)));

      // images
      images.forEach((img) => fd.append("images", img));

      const res = await apiFetch<{ success: boolean; property: any; message?: string }>(
        "/properties",
        { method: "POST", body: fd }
      );

      if (res?.success) {
        setSuccessMsg("✅ Property created (Pending). Showing it below.");
        setCreatedProperty(res.property);

        // reset form (keep success + created property visible)
        setFormData({
          title: "",
          description: "",
          price: "",
          currency: "NPR",
          location: "",
          address: "",
          beds: "",
          baths: "",
          sqft: "",
          propertyType: "house",
          listingType: "buy",
        });
        setImages([]);
      } else {
        setError(res?.message || "Failed to create property");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create property");
    } finally {
      setLoading(false);
    }
  };

  // Helper: try to read images from backend response safely
  const createdImages: string[] = useMemo(() => {
    if (!createdProperty) return [];
    const p = createdProperty;

    // support common shapes:
    // p.images = ["url", ...] OR [{url:""}, {path:""}]
    const imgs = Array.isArray(p.images) ? p.images : [];
    return imgs
      .map((x: any) => (typeof x === "string" ? x : x?.url || x?.path || x?.secure_url))
      .filter(Boolean);
  }, [createdProperty]);

  return (
    <main className="min-h-screen bg-emerald-50 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Add Property (Admin)</h1>
            <p className="mt-2 text-sm text-slate-600">
              Create a listing. It will be <span className="font-semibold">pending</span>{" "}
              until approved.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-emerald-50"
          >
            Cancel
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5" />
              <div>{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title + Price */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Title *</label>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                  placeholder="Modern 3-Bedroom House"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Price *</label>
                <input
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                  placeholder="12500000"
                />
              </div>
            </div>

            {/* Currency + ListingType */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Currency</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                >
                  <option value="NPR">NPR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Listing Type
                </label>
                <select
                  name="listingType"
                  value={formData.listingType}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                >
                  <option value="buy">For Sale</option>
                  <option value="rent">For Rent</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                placeholder="Write details about this property..."
              />
            </div>

            {/* Location + Address */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Location *</label>
                <input
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                  placeholder="Kathmandu, Nepal"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Address</label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                  placeholder="Baneshwor, Kathmandu"
                />
              </div>
            </div>

            {/* Beds / Baths / Sqft / PropertyType */}
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Beds</label>
                <input
                  name="beds"
                  value={formData.beds}
                  onChange={handleChange}
                  disabled={loading}
                  type="number"
                  min="0"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Baths</label>
                <input
                  name="baths"
                  value={formData.baths}
                  onChange={handleChange}
                  disabled={loading}
                  type="number"
                  min="0"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Sqft</label>
                <input
                  name="sqft"
                  value={formData.sqft}
                  onChange={handleChange}
                  disabled={loading}
                  type="number"
                  min="0"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Property Type
                </label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                >
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="condo">Condo</option>
                  <option value="land">Land</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Images * (max {MAX_IMAGES})
              </label>

              <div className="mt-2 rounded-2xl border-2 border-dashed border-slate-300 p-6">
                <input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={loading || images.length >= MAX_IMAGES}
                  className="hidden"
                />
                <label
                  htmlFor="images"
                  className="flex cursor-pointer flex-col items-center justify-center"
                >
                  <Upload className="h-7 w-7 text-slate-400" />
                  <div className="mt-2 text-sm font-semibold text-slate-700">
                    Click to upload images
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    PNG/JPG, up to {MAX_IMAGES} images
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    Selected: {images.length}/{MAX_IMAGES}
                  </div>
                </label>
              </div>

              {images.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-semibold text-slate-700">
                    {images.length} image(s) selected
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
                    {previews.map((src, idx) => (
                      <div key={src} className="relative overflow-hidden rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={`Preview ${idx + 1}`}
                          className="h-28 w-full rounded-xl object-cover ring-1 ring-black/10"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          disabled={loading}
                          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                          aria-label="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Uploading..." : "Create Property"}
              </button>
            </div>
          </form>
        </div>

        {/* ✅ NEW: show created property after submit */}
        {createdProperty && (
          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Newly Added (Pending)</h2>
                <p className="mt-1 text-sm text-slate-600">
                  This is the property you just created.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/admin/listings-approval")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Go to Approval
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {createdImages.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={createdImages[0]}
                    alt="Created property cover"
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="grid h-56 place-items-center text-sm font-semibold text-slate-500">
                    No image URL returned by backend
                  </div>
                )}

                {createdImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 p-3">
                    {createdImages.slice(1, 5).map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src + i}
                        src={src}
                        alt={`thumb-${i}`}
                        className="h-16 w-full rounded-xl object-cover ring-1 ring-black/10"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-xl font-extrabold text-slate-900">
                  {createdProperty.title || "Untitled"}
                </div>

                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">Location:</span>{" "}
                  {createdProperty.location || "-"}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                    {createdProperty.listingType === "rent" ? "For Rent" : "For Sale"}
                  </span>
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-800 ring-1 ring-slate-200">
                    {createdProperty.propertyType || "house"}
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
                    Pending
                  </span>
                </div>

                <div className="text-base font-extrabold text-slate-900">
                  {createdProperty.currency || "NPR"}{" "}
                  {Number(createdProperty.price || 0).toLocaleString()}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-500">Beds</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {createdProperty.beds ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-500">Baths</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {createdProperty.baths ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-500">Sqft</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {createdProperty.sqft ?? 0}
                    </div>
                  </div>
                </div>

                {createdProperty.description && (
                  <p className="pt-2 text-sm text-slate-600">
                    {createdProperty.description}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

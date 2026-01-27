"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { ArrowLeft, UploadCloud, X, Star } from "lucide-react";

type Property = {
  _id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  location: string;
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  propertyType: string;
  listingType: string;
  status: string;
  images: { url: string; publicId: string }[];
};

const MAX_IMAGES = 6;

export default function SellerEditPropertyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [images, setImages] = useState<File[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);

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
  });

  // ✅ previews for newly added images
  const previews = useMemo(() => {
    return images.map((f) => URL.createObjectURL(f));
  }, [images]);

  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previews]);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await apiFetch<{ success: boolean; property: Property }>(
          `/properties/mine/${params.id}`
        );

        if (response.success) {
          setProperty(response.property);
          setFormData({
            title: response.property.title || "",
            description: response.property.description || "",
            price: String(response.property.price ?? ""),
            currency: response.property.currency || "USD",
            location: response.property.location || "",
            address: response.property.address || "",
            beds: String(response.property.beds ?? ""),
            baths: String(response.property.baths ?? ""),
            sqft: String(response.property.sqft ?? ""),
            propertyType: response.property.propertyType || "house",
            listingType: response.property.listingType || "buy",
          });
        } else {
          setError("Failed to load property");
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load property");
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) fetchProperty();
  }, [params?.id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const picked = Array.from(e.target.files);
    const combined = [...images, ...picked].slice(0, MAX_IMAGES);

    setImages(combined);
    if (coverIndex >= combined.length) setCoverIndex(0);

    // reset so selecting same file again works
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);

      if (next.length === 0) {
        setCoverIndex(0);
      } else if (index === coverIndex) {
        setCoverIndex(0);
      } else if (index < coverIndex) {
        setCoverIndex((c) => Math.max(0, c - 1));
      }

      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const formDataToSend = new FormData();

      // ✅ append all text fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      // ✅ numeric safety (same style as your add page)
      formDataToSend.set("price", String(Number(formData.price || 0)));
      formDataToSend.set("beds", String(Number(formData.beds || 0)));
      formDataToSend.set("baths", String(Number(formData.baths || 0)));
      formDataToSend.set("sqft", String(Number(formData.sqft || 0)));

      // ✅ if user added new images, put cover first (buyers see first image)
      if (images.length > 0) {
        const ordered = images.slice();
        const cover = ordered.splice(coverIndex, 1)[0];
        const finalImages = [cover, ...ordered];
        finalImages.forEach((img) => formDataToSend.append("images", img));
      }

      const response = await apiFetch<{ success: boolean; property: any }>(
        `/properties/${params.id}`,
        {
          method: "PATCH",
          body: formDataToSend,
        }
      );

      if (response.success) {
        router.push(`/seller/property/${params.id}`);
      } else {
        setError("Failed to update property");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update property");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 px-6 py-10">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-r-2 border-emerald-600" />
          <p className="mt-4 text-slate-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 px-6 py-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* sticky header */}
        <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-slate-200 bg-white/75 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="text-right">
              <div className="text-sm font-extrabold text-slate-900">Edit Property</div>
              <div className="text-xs text-slate-600">
                Update details & upload new images.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-7">
          {property && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Note: Editing this property may reset its status to{" "}
              <span className="font-bold">pending</span> for admin re-approval.
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Property Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  placeholder="Beautiful 3BHK House"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, location: e.target.value }))
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  placeholder="Kathmandu, Nepal"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={5}
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                placeholder="Describe your property..."
              />
            </div>

            {/* Price and Currency */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Price *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, price: e.target.value }))
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  placeholder="500000"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, currency: e.target.value }))
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                >
                  <option value="USD">USD</option>
                  <option value="NPR">NPR</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Bedrooms
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.beds}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, beds: e.target.value }))
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  placeholder="3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Bathrooms
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.baths}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, baths: e.target.value }))
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  placeholder="2"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Square Feet
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.sqft}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sqft: e.target.value }))
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  placeholder="1200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Property Type
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, propertyType: e.target.value }))
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
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

            {/* Address */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                placeholder="123 Main Street, Kathmandu"
              />
            </div>

            {/* Listing Type */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Listing Type
              </label>
              <select
                value={formData.listingType}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, listingType: e.target.value }))
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              >
                <option value="buy">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
            </div>

            {/* Images */}
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Add New Images (Optional)
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    You can upload up to {MAX_IMAGES} images. Choose a cover for the new uploads.
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  {images.length}/{MAX_IMAGES}
                </div>
              </div>

              <div className="mt-3">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={saving || images.length >= MAX_IMAGES}
                  className="hidden"
                  id="image-upload"
                />

                <label
                  htmlFor="image-upload"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/30"
                >
                  <UploadCloud className="h-8 w-8 text-slate-400" />
                  <span className="mt-2 font-semibold">Click to upload images</span>
                  <span className="mt-1 text-xs text-slate-500">
                    PNG/JPG • Max {MAX_IMAGES} images
                  </span>
                </label>

                {/* New image previews */}
                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                    {previews.map((src, idx) => (
                      <div
                        key={src}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={`Preview ${idx + 1}`}
                          className="h-28 w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => setCoverIndex(idx)}
                          disabled={saving}
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

                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          disabled={saving}
                          className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/75"
                          title="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Existing images */}
                {property?.images?.length ? (
                  <div className="mt-6">
                    <p className="mb-2 text-sm font-semibold text-slate-800">
                      Current images
                    </p>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                      {property.images.map((image, index) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={image.publicId || index}
                          src={image.url}
                          alt={`Current ${index + 1}`}
                          className="h-32 w-full rounded-xl object-cover ring-1 ring-slate-200"
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      (This page shows current images. Removing old images needs a backend
                      endpoint like DELETE /properties/:id/images/:publicId.)
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Submit */}
            <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Update Property"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

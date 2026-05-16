"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { Upload, X, CheckCircle2, RefreshCcw } from "lucide-react";

const MAX_IMAGES = 6;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const DRAFT_KEY = "admin:add-property:draft:v1";
const EMPTY_FORM = {
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
};

function formatLabel(value?: string) {
  const text = String(value || "").trim();
  if (!text) return "Unknown";
  return text.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AdminAddPropertyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [draftMsg, setDraftMsg] = useState("");
  const [imageFeedback, setImageFeedback] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [createdProperty, setCreatedProperty] = useState<any>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [images, setImages] = useState<File[]>([]);

  const hasUnsavedChanges = useMemo(() => {
    const formDirty = JSON.stringify(formData) !== JSON.stringify(EMPTY_FORM);
    return formDirty || images.length > 0;
  }, [formData, images.length]);

  const previews = useMemo(() => images.map((f) => URL.createObjectURL(f)), [images]);
  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previews]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const key = e.target.name;
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const invalids: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        invalids.push(`${file.name}: invalid file type`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        invalids.push(`${file.name}: exceeds ${MAX_IMAGE_SIZE_MB}MB`);
        continue;
      }
      validFiles.push(file);
    }

    setImages((prev) => [...prev, ...validFiles].slice(0, MAX_IMAGES));
    setImageFeedback(
      invalids.length
        ? `Some files were skipped: ${invalids.join(", ")}`
        : validFiles.length
        ? `${validFiles.length} image(s) added.`
        : ""
    );

    setFieldErrors((prev) => {
      if (!prev.images) return prev;
      const next = { ...prev };
      delete next.images;
      return next;
    });

    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancelNavigation = () => {
    if (!hasUnsavedChanges) {
      router.back();
      return;
    }
    const ok = window.confirm("You have unsaved changes. Leave this page?");
    if (ok) router.back();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");
    setCreatedProperty(null);
    setImageFeedback("");

    const nextErrors: Record<string, string> = {};
    if (!formData.title.trim()) nextErrors.title = "Title is required.";
    const numericPrice = Number(formData.price || 0);
    if (!numericPrice || numericPrice <= 0) {
      nextErrors.price =
        formData.listingType === "rent"
          ? "Monthly rent must be greater than 0."
          : "Price must be greater than 0.";
    }
    if (!formData.location.trim()) nextErrors.location = "Location is required.";
    if (images.length === 0) nextErrors.images = "Please upload at least 1 image.";

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setLoading(false);
      return;
    }

    try {
      const fd = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        fd.append(key, value);
      });

      fd.set("price", String(numericPrice));
      if (formData.listingType === "rent") {
        // Backend validates monthlyRent for rental listings.
        fd.set("monthlyRent", String(numericPrice));
      }
      fd.set("beds", String(Number(formData.beds || 0)));
      fd.set("baths", String(Number(formData.baths || 0)));
      fd.set("sqft", String(Number(formData.sqft || 0)));

      images.forEach((img) => fd.append("images", img));

      const res = await apiFetch<{ success: boolean; property: any; message?: string }>(
        "/properties",
        { method: "POST", body: fd }
      );

      if (res?.success) {
        setSuccessMsg("Property created (Pending). Showing it below.");
        setCreatedProperty(res.property);
        setFieldErrors({});
        setDraftMsg("");

        setFormData(EMPTY_FORM);
        setImages([]);
        window.localStorage.removeItem(DRAFT_KEY);
      } else {
        setError(res?.message || "Failed to create property");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create property");
    } finally {
      setLoading(false);
    }
  };

  const createdImages: string[] = useMemo(() => {
    if (!createdProperty) return [];
    const p = createdProperty;
    const imgs = Array.isArray(p.images) ? p.images : [];
    return imgs
      .map((x: any) => (typeof x === "string" ? x : x?.url || x?.path || x?.secure_url))
      .filter(Boolean);
  }, [createdProperty]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.formData) {
        setFormData((prev) => ({ ...prev, ...parsed.formData }));
        setDraftMsg("Recovered your local draft.");
      }
    } catch {
      // ignore malformed drafts
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          formData,
          savedAt: Date.now(),
        })
      );
    } catch {
      // ignore storage errors
    }
  }, [formData]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <main className="min-h-screen bg-[#f4fbf7] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <section className="mb-6 overflow-hidden rounded-[34px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50">
                Live admin overview
              </span>
              <h1 className="mt-4 ps-page-title text-white">Add Property</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                Create a new listing for the platform. New submissions stay pending until approved.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCancelNavigation}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </section>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {draftMsg && (
            <div className="mb-4 rounded-xl border border-[#c9ddd2] bg-[#f4fbf7] p-3 text-sm font-medium text-[#316249]">
              {draftMsg}
            </div>
          )}

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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Title *</label>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#316249] focus:outline-none focus:ring-2 focus:ring-[#316249]/20 disabled:opacity-60"
                  placeholder="Modern 3-Bedroom House"
                />
                <p className="mt-1 text-xs text-slate-500">Use a clear, searchable listing title.</p>
                {fieldErrors.title && <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  {formData.listingType === "rent" ? "Monthly Rent *" : "Price *"}
                </label>
                <input
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#316249] focus:outline-none focus:ring-2 focus:ring-[#316249]/20 disabled:opacity-60"
                  placeholder="12500000"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {formData.listingType === "rent"
                    ? "Enter monthly rent in selected currency."
                    : "Enter total asking price in selected currency."}
                </p>
                {fieldErrors.price && <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.price}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Currency *</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#316249] focus:outline-none focus:ring-2 focus:ring-[#316249]/20 disabled:opacity-60"
                >
                  <option value="NPR">NPR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Listing Type *</label>
                <select
                  name="listingType"
                  value={formData.listingType}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#316249] focus:outline-none focus:ring-2 focus:ring-[#316249]/20 disabled:opacity-60"
                >
                  <option value="buy">For Sale</option>
                  <option value="rent">For Rent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#316249] focus:outline-none focus:ring-2 focus:ring-[#316249]/20 disabled:opacity-60"
                placeholder="Write details about this property..."
              />
              <p className="mt-1 text-xs text-slate-500">Add key features, neighborhood, and condition details.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Location *</label>
                <input
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#316249] focus:outline-none focus:ring-2 focus:ring-[#316249]/20 disabled:opacity-60"
                  placeholder="Kathmandu, Nepal"
                />
                <p className="mt-1 text-xs text-slate-500">City/area buyers will recognize quickly.</p>
                {fieldErrors.location && <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.location}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Address</label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#316249] focus:outline-none focus:ring-2 focus:ring-[#316249]/20 disabled:opacity-60"
                  placeholder="Baneshwor, Kathmandu"
                />
              </div>
            </div>

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
                  max="50"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#316249] focus:outline-none focus:ring-2 focus:ring-[#316249]/20 disabled:opacity-60"
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
                  max="50"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#316249] focus:outline-none focus:ring-2 focus:ring-[#316249]/20 disabled:opacity-60"
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
                  max="200000"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#316249] focus:outline-none focus:ring-2 focus:ring-[#316249]/20 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Property Type *</label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#316249] focus:outline-none focus:ring-2 focus:ring-[#316249]/20 disabled:opacity-60"
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

            <div>
              <label className="block text-sm font-semibold text-slate-700">Images * (max {MAX_IMAGES})</label>

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
                <label htmlFor="images" className="flex cursor-pointer flex-col items-center justify-center">
                  <Upload className="h-7 w-7 text-slate-400" />
                  <div className="mt-2 text-sm font-semibold text-slate-700">Click to upload images</div>
                  <div className="mt-1 text-xs text-slate-500">
                    PNG/JPG/WEBP, up to {MAX_IMAGES} images, {MAX_IMAGE_SIZE_MB}MB each
                  </div>
                  <div className="mt-2 text-xs text-slate-600">Selected: {images.length}/{MAX_IMAGES}</div>
                </label>
              </div>

              {imageFeedback && <p className="mt-2 text-xs font-medium text-slate-600">{imageFeedback}</p>}
              {fieldErrors.images && <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.images}</p>}

              {images.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-semibold text-slate-700">{images.length} image(s) selected</div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {previews.map((src, idx) => (
                      <div key={src} className="relative overflow-hidden rounded-xl">
                        <img
                          src={src}
                          alt={`Preview ${idx + 1}`}
                          className="h-28 w-full rounded-xl object-cover ring-1 ring-black/10"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          disabled={loading}
                          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#316249] text-white hover:bg-[#274e3b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#316249]/30 disabled:opacity-60"
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

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelNavigation}
                disabled={loading}
                className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-[#e9f3ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#316249]/30 disabled:opacity-60 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#316249] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#274e3b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#316249]/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                aria-busy={loading}
              >
                {loading ? "Saving Property..." : "Create Property"}
              </button>
            </div>
          </form>
        </div>

        {createdProperty && (
          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Newly Added (Pending)</h2>
                <p className="mt-1 text-sm font-normal text-slate-600">This is the property you just created.</p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/admin/listings-approval")}
                className="rounded-xl bg-[#316249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#274e3b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#316249]/30"
              >
                Go to Approval
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {createdImages.length > 0 ? (
                  <img src={createdImages[0]} alt="Created property cover" className="h-56 w-full object-cover" />
                ) : (
                  <div className="grid h-56 place-items-center text-sm font-semibold text-slate-500">
                    No image URL returned by backend
                  </div>
                )}

                {createdImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 p-3">
                    {createdImages.slice(1, 5).map((src, i) => (
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
                <div className="text-[24px] leading-tight font-semibold text-slate-900">{createdProperty.title || "Untitled"}</div>

                <div className="text-base font-normal text-slate-700">
                  <span className="font-semibold text-slate-800">Location:</span> {createdProperty.location || "-"}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#e9f3ee] px-3 py-1 text-sm font-semibold text-[#316249] ring-1 ring-[#c9ddd2]">
                    {createdProperty.listingType === "rent" ? "For Rent" : "For Sale"}
                  </span>
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800 ring-1 ring-slate-200">
                    {formatLabel(createdProperty.propertyType || "house")}
                  </span>
                  <span className="rounded-full bg-[#f2f7f4] px-3 py-1 text-sm font-medium text-[#3f6f57] ring-1 ring-[#d7e6dc]">
                    Pending
                  </span>
                </div>

                <div className="text-[26px] leading-tight font-semibold text-slate-900">
                  {createdProperty.currency || "NPR"} {Number(createdProperty.price || 0).toLocaleString()}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-sm font-medium text-slate-500">Beds</div>
                    <div className="mt-1 text-[20px] leading-tight font-semibold text-slate-900">{createdProperty.beds ?? 0}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-sm font-medium text-slate-500">Baths</div>
                    <div className="mt-1 text-[20px] leading-tight font-semibold text-slate-900">{createdProperty.baths ?? 0}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-sm font-medium text-slate-500">Sqft</div>
                    <div className="mt-1 text-[20px] leading-tight font-semibold text-slate-900">{createdProperty.sqft ?? 0}</div>
                  </div>
                </div>

                {createdProperty.description && <p className="pt-2 text-base font-normal text-slate-600">{createdProperty.description}</p>}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

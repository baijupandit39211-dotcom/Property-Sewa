"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import {
  ArrowLeft,
  UploadCloud,
  X,
  Star,
  ExternalLink,
  ClipboardPaste,
} from "lucide-react";

const OFFER_CATEGORIES = [
  { value: "none", label: "No Offer" },
  { value: "dashain", label: "Dashain Festival Offers" },
  { value: "latest", label: "Latest Deals" },
  { value: "hot", label: "Hot Deals" },
  { value: "limited_time", label: "Limited Time Offers" },
] as const;
const OFFER_DISCOUNT_TYPES = [
  { value: "none", label: "No Discount" },
  { value: "percentage", label: "Percentage" },
  { value: "fixed", label: "Fixed Amount" },
] as const;

type Property = {
  _id: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  location: string;
  address?: string;

  beds?: number;
  baths?: number;
  sqft?: number;

  propertyType?: string;
  listingType?: string;
  status?: string;

  furnishing?: "unfurnished" | "semi" | "full";
  availabilityDate?: string;
  monthlyRent?: number;
  deposit?: number;
  advanceAmount?: number;

  yearBuilt?: number;
  floor?: number;
  totalFloors?: number;
  facing?: "east" | "west" | "north" | "south";
  roadAccessFt?: number;

  // stored as landmark in backend (we label it Google Map)
  landmark?: string;
  offerCategory?: "none" | "dashain" | "latest" | "hot" | "limited_time";
  offerTitle?: string;
  offerDescription?: string;
  offerBadge?: string;
  offerDiscountType?: "none" | "percentage" | "fixed";
  offerDiscountValue?: number;
  offerValidUntil?: string;
  offerActive?: boolean;

  amenities?: string[];

  images: { url: string; publicId: string }[];
};

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

function clampCoverIndex(len: number, nextIndex: number) {
  if (len <= 0) return 0;
  if (nextIndex < 0) return 0;
  if (nextIndex >= len) return 0;
  return nextIndex;
}

export default function SellerEditPropertyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id || "");

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [images, setImages] = useState<File[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);

  const [amenities, setAmenities] = useState<Amenity[]>([]);

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

    furnishing: "unfurnished",
    availabilityDate: "",
    monthlyRent: "",
    deposit: "",
    advanceAmount: "",

    yearBuilt: "",
    floor: "",
    totalFloors: "",
    facing: "east",
    roadAccessFt: "",

    landmark: "", // UI label: Google Map link
    offerCategory: "none",
    offerTitle: "",
    offerDescription: "",
    offerBadge: "",
    offerDiscountType: "none",
    offerDiscountValue: "",
    offerValidUntil: "",
    offerActive: false,
  });

  const previews = useMemo(
    () => images.map((f) => URL.createObjectURL(f)),
    [images]
  );

  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      setError("");

      try {
        // ✅ adjust endpoint to your backend
        const response = await apiFetch<{ success: boolean; property: Property }>(
          `/properties/mine/${id}`
        );

        if (!response?.success || !response?.property) {
          setError("Failed to load property");
          setProperty(null);
          setLoading(false);
          return;
        }

        const p = response.property;
        setProperty(p);

        // amenities
        const nextAmenities = Array.isArray(p.amenities)
          ? (p.amenities.filter(Boolean).map(String) as Amenity[])
          : [];
        setAmenities(nextAmenities);

        setFormData({
          title: p.title || "",
          description: p.description || "",
          price: String(p.price ?? ""),
          currency: p.currency || "USD",
          location: p.location || "",
          address: p.address || "",

          beds: String(p.beds ?? ""),
          baths: String(p.baths ?? ""),
          sqft: String(p.sqft ?? ""),

          propertyType: p.propertyType || "house",
          listingType: p.listingType || "buy",

          furnishing: (p.furnishing as any) || "unfurnished",
          availabilityDate: (p.availabilityDate || "").slice(0, 10),
          monthlyRent: String(p.monthlyRent ?? ""),
          deposit: String(p.deposit ?? ""),
          advanceAmount: String(p.advanceAmount ?? ""),

          yearBuilt: String(p.yearBuilt ?? ""),
          floor: String(p.floor ?? ""),
          totalFloors: String(p.totalFloors ?? ""),
          facing: (p.facing as any) || "east",
          roadAccessFt: String(p.roadAccessFt ?? ""),

          landmark: p.landmark || "",
          offerCategory: p.offerCategory || "none",
          offerTitle: p.offerTitle || "",
          offerDescription: p.offerDescription || "",
          offerBadge: p.offerBadge || "",
          offerDiscountType: p.offerDiscountType || "none",
          offerDiscountValue: String(p.offerDiscountValue ?? ""),
          offerValidUntil: (p.offerValidUntil || "").slice(0, 10),
          offerActive: Boolean(p.offerActive),
        });
      } catch (err: any) {
        setError(err?.message || "Failed to load property");
        setProperty(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProperty();
  }, [id]);

  const isRent = formData.listingType === "rent";
  const hasOffer = formData.offerCategory !== "none";
  const hasDiscount =
    hasOffer &&
    (formData.offerDiscountType === "percentage" ||
      formData.offerDiscountType === "fixed");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.target;
    const nextValue =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;
    setFormData((prev) => ({ ...prev, [target.name]: nextValue }));
  };

  const toggleAmenity = (a: Amenity) => {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files);
    const combined = [...images, ...picked].slice(0, MAX_IMAGES);

    setImages(combined);
    setCoverIndex((prev) => clampCoverIndex(combined.length, prev));

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

  // ✅ Google Maps helpers
  const openGoogleMapsPicker = () => {
    const qRaw = `${formData.address || ""} ${formData.location || ""}`.trim();
    const q = encodeURIComponent(qRaw || "Kathmandu");
    const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      setFormData((p) => ({ ...p, landmark: text }));
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const formDataToSend = new FormData();

      // append only non-empty fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined) return;
        formDataToSend.append(key, String(value));
      });

      // numeric safety
      formDataToSend.set("price", String(Number(formData.price || 0)));
      formDataToSend.set("beds", String(Number(formData.beds || 0)));
      formDataToSend.set("baths", String(Number(formData.baths || 0)));
      formDataToSend.set("sqft", String(Number(formData.sqft || 0)));

      formDataToSend.set(
        "advanceAmount",
        String(Number(formData.advanceAmount || 0))
      );
      formDataToSend.set("yearBuilt", String(Number(formData.yearBuilt || 0)));
      formDataToSend.set("floor", String(Number(formData.floor || 0)));
      formDataToSend.set(
        "totalFloors",
        String(Number(formData.totalFloors || 0))
      );
      formDataToSend.set(
        "roadAccessFt",
        String(Number(formData.roadAccessFt || 0))
      );

      if (formData.listingType === "rent") {
        formDataToSend.set(
          "monthlyRent",
          String(Number(formData.monthlyRent || 0))
        );
        formDataToSend.set("deposit", String(Number(formData.deposit || 0)));
      } else {
        // clean rent-only fields if switching to buy
        formDataToSend.delete("monthlyRent");
        formDataToSend.delete("deposit");
        formDataToSend.delete("availabilityDate");
      }

      if (formData.offerCategory === "none") {
        formDataToSend.set("offerCategory", "none");
        formDataToSend.set("offerTitle", "");
        formDataToSend.set("offerDescription", "");
        formDataToSend.set("offerBadge", "");
        formDataToSend.set("offerDiscountType", "none");
        formDataToSend.set("offerDiscountValue", "0");
        formDataToSend.delete("offerValidUntil");
        formDataToSend.set("offerActive", "false");
      } else {
        formDataToSend.set(
          "offerDiscountValue",
          String(Number(formData.offerDiscountValue || 0))
        );
        if (formData.offerDiscountType === "none") {
          formDataToSend.set("offerDiscountValue", "0");
        }
        if (!formData.offerValidUntil) {
          formDataToSend.delete("offerValidUntil");
        }
        formDataToSend.set("offerActive", String(Boolean(formData.offerActive)));
      }

      // amenities
      if (amenities.length > 0) {
        formDataToSend.set("amenities", JSON.stringify(amenities));
      } else {
        // if you want to clear amenities on backend, uncomment:
        // formDataToSend.set("amenities", JSON.stringify([]));
      }

      // new images (cover first)
      if (images.length > 0) {
        const ordered = images.slice();
        const safeCover = clampCoverIndex(ordered.length, coverIndex);
        const cover = ordered.splice(safeCover, 1)[0];
        const finalImages = cover ? [cover, ...ordered] : ordered;

        finalImages.forEach((img) => formDataToSend.append("images", img));
        formDataToSend.set("coverIndex", String(safeCover));
      }

      const response = await apiFetch<{ success: boolean; property?: any }>(
        `/properties/${id}`,
        { method: "PATCH", body: formDataToSend }
      );

      if (response?.success) {
        // ✅ redirect path (change to your actual page)
        router.push(`/seller/property/${id}`);
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
      <div className="min-h-0 bg-gradient-to-b from-emerald-50 via-white to-slate-50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white/75 px-4 py-4 backdrop-blur">
            <div className="h-5 w-20 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 h-4 w-40 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <div className="h-6 w-52 animate-pulse rounded bg-slate-100" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="h-11 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
            <div className="mt-6 h-28 animate-pulse rounded-xl bg-slate-100" />
          </div>
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
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="text-right">
              <div className="text-sm font-extrabold text-slate-900">
                Edit Property
              </div>
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
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
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
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  placeholder="Kathmandu, Nepal"
                />
              </div>
            </div>

            {/* Address + Google Map */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Google Map (optional)
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleChange}
                    disabled={saving}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                    placeholder="Paste Google Maps share link here"
                  />

                  <button
                    type="button"
                    onClick={openGoogleMapsPicker}
                    disabled={saving}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                    title="Open Google Maps and pick the exact location"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Pick
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={pasteFromClipboard}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                    title="Paste copied Google Maps link"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                    Paste from clipboard
                  </button>

                  {formData.landmark?.startsWith("http") && (
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          formData.landmark,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Preview
                    </button>
                  )}
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Tip: Pick → Share → copy link → Paste.
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                placeholder="Describe your property..."
              />
            </div>

            {/* Price / Currency / Advance */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Price *
                </label>
                <input
                  type="number"
                  name="price"
                  required
                  min={0}
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                >
                  <option value="USD">USD</option>
                  <option value="NPR">NPR</option>
                  <option value="INR">INR</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Advance Amount
                </label>
                <input
                  type="number"
                  name="advanceAmount"
                  min={0}
                  step="0.01"
                  value={formData.advanceAmount}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Booking amount buyer pays (optional).
                </p>
              </div>
            </div>

            {/* Specs + Type */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Bedrooms
                </label>
                <input
                  type="number"
                  name="beds"
                  min={0}
                  value={formData.beds}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Bathrooms
                </label>
                <input
                  type="number"
                  name="baths"
                  min={0}
                  value={formData.baths}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Sqft
                </label>
                <input
                  type="number"
                  name="sqft"
                  min={0}
                  value={formData.sqft}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Property Type
                </label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                >
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="condo">Condo</option>
                  <option value="land">Land</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Listing Type
                </label>
                <select
                  name="listingType"
                  value={formData.listingType}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                >
                  <option value="buy">For Sale</option>
                  <option value="rent">For Rent</option>
                </select>
              </div>
            </div>

            {/* Furnishing + Facing */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Furnishing
                </label>
                <select
                  name="furnishing"
                  value={formData.furnishing}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                >
                  <option value="unfurnished">Unfurnished</option>
                  <option value="semi">Semi Furnished</option>
                  <option value="full">Fully Furnished</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Facing
                </label>
                <select
                  name="facing"
                  value={formData.facing}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                >
                  <option value="east">East</option>
                  <option value="west">West</option>
                  <option value="north">North</option>
                  <option value="south">South</option>
                </select>
              </div>
            </div>

            {/* Floors / YearBuilt / Road */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Year Built
                </label>
                <input
                  type="number"
                  name="yearBuilt"
                  min={0}
                  value={formData.yearBuilt}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Floor
                </label>
                <input
                  type="number"
                  name="floor"
                  min={0}
                  value={formData.floor}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Total Floors
                </label>
                <input
                  type="number"
                  name="totalFloors"
                  min={0}
                  value={formData.totalFloors}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Road Access (ft)
                </label>
                <input
                  type="number"
                  name="roadAccessFt"
                  min={0}
                  value={formData.roadAccessFt}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Rent-only */}
            {isRent && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
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
                      min={0}
                      value={formData.monthlyRent}
                      onChange={handleChange}
                      disabled={saving}
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
                      min={0}
                      value={formData.deposit}
                      onChange={handleChange}
                      disabled={saving}
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
                      disabled={saving}
                      className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="mb-3 text-sm font-semibold text-emerald-900">
                Property Offer
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Offer Category
                  </label>
                  <select
                    name="offerCategory"
                    value={formData.offerCategory}
                    onChange={handleChange}
                    disabled={saving}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  >
                    {OFFER_CATEGORIES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 mt-7 md:mt-0">
                  <input
                    type="checkbox"
                    name="offerActive"
                    checked={Boolean(formData.offerActive)}
                    onChange={handleChange}
                    disabled={saving || !hasOffer}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    Activate this offer
                  </span>
                </label>
              </div>

              {hasOffer && (
                <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Offer Title
                    </label>
                    <input
                      type="text"
                      name="offerTitle"
                      value={formData.offerTitle}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g., Dashain Special Discount"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Offer Badge
                    </label>
                    <input
                      type="text"
                      name="offerBadge"
                      value={formData.offerBadge}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="e.g., Save 15%"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Offer Description
                    </label>
                    <textarea
                      name="offerDescription"
                      value={formData.offerDescription}
                      onChange={handleChange}
                      rows={3}
                      disabled={saving}
                      placeholder="Short offer details for cards and property detail page."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Discount Type
                    </label>
                    <select
                      name="offerDiscountType"
                      value={formData.offerDiscountType}
                      onChange={handleChange}
                      disabled={saving}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                    >
                      {OFFER_DISCOUNT_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      name="offerDiscountValue"
                      min={0}
                      step="0.01"
                      value={formData.offerDiscountValue}
                      onChange={handleChange}
                      disabled={saving || !hasDiscount}
                      placeholder={
                        formData.offerDiscountType === "percentage" ? "e.g., 10" : "e.g., 5000"
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      name="offerValidUntil"
                      value={formData.offerValidUntil}
                      onChange={handleChange}
                      disabled={saving}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ✅ Amenities */}
            <div>
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
                      disabled={saving}
                      className={[
                        "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                        active
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-100"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        saving ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Images */}
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Add New Images (Optional)
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload up to {MAX_IMAGES}. Choose a cover for new uploads.
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

                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                    {previews.map((src, idx) => (
                      <div
                        key={`${src}-${idx}`}
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
                      Removing old images needs backend endpoint like DELETE
                      /properties/:id/images/:publicId.
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

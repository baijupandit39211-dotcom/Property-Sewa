"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import {
  X,
  Star,
  UploadCloud,
  Copy,
  ExternalLink,
  ClipboardPaste,
  Wand2,
} from "lucide-react";

const MAX_IMAGES = 6;
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

// ✅ Extract lat,lng from google url containing .../@27.66,85.33,17z
function extractLatLngFromGoogleUrl(url: string) {
  const m = url.match(/@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/);
  if (!m) return null;
  return { lat: m[1], lng: m[3] };
}

// ✅ Accept coordinates "lat,lng"
function isLatLng(value: string) {
  return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(value);
}

export default function SellerAddPropertyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ show created property id
  const [createdPropertyId, setCreatedPropertyId] = useState<string>("");

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

    // ✅ store google location as: "lat,lng" OR a link
    landmark: "",
    offerCategory: "none",
    offerTitle: "",
    offerDescription: "",
    offerBadge: "",
    offerDiscountType: "none",
    offerDiscountValue: "",
    offerValidUntil: "",
    offerActive: false,
  });

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [coverIndex, setCoverIndex] = useState<number>(0);

  const previews = useMemo(
    () => images.map((f) => URL.createObjectURL(f)),
    [images]
  );

  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  const isRent = formData.listingType === "rent";

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

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  // ✅ Convert link → lat,lng (best for buyer embed)
  const convertLandmarkToLatLng = () => {
    const raw = String(formData.landmark || "").trim();
    if (!raw) return;

    // already lat,lng
    if (isLatLng(raw)) return;

    // try extract from google url with @lat,lng
    if (raw.startsWith("http")) {
      const ll = extractLatLngFromGoogleUrl(raw);
      if (ll) {
        setFormData((p) => ({ ...p, landmark: `${ll.lat},${ll.lng}` }));
        return;
      }
    }

    alert(
      "Could not extract coordinates.\n\nTip: Open Maps → Share → Copy link. The link must contain @lat,lng."
    );
  };

  const resetAfterSuccess = () => {
    setFormData({
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

      landmark: "",
      offerCategory: "none",
      offerTitle: "",
      offerDescription: "",
      offerBadge: "",
      offerDiscountType: "none",
      offerDiscountValue: "",
      offerValidUntil: "",
      offerActive: false,
    });
    setAmenities([]);
    setImages([]);
    setCoverIndex(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setCreatedPropertyId("");

    try {
      if (images.length === 0) {
        setError("Please select at least 1 image.");
        setLoading(false);
        return;
      }

      const formDataToSend = new FormData();

      // add text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined) return;
        formDataToSend.append(key, String(value));
      });

      // force numbers
      formDataToSend.set("price", String(Number(formData.price || 0)));
      formDataToSend.set("beds", String(Number(formData.beds || 0)));
      formDataToSend.set("baths", String(Number(formData.baths || 0)));
      formDataToSend.set("sqft", String(Number(formData.sqft || 0)));
      formDataToSend.set(
        "advanceAmount",
        String(Number(formData.advanceAmount || 0))
      );

      if (formData.listingType === "rent") {
        formDataToSend.set(
          "monthlyRent",
          String(Number(formData.monthlyRent || 0))
        );
        formDataToSend.set("deposit", String(Number(formData.deposit || 0)));
      } else {
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
      }

      // cover index (backend optional)
      formDataToSend.set(
        "coverIndex",
        String(clampCoverIndex(images.length, coverIndex))
      );

      // images order: cover first
      const ordered = images.slice();
      const safeCover = clampCoverIndex(ordered.length, coverIndex);
      const cover = ordered.splice(safeCover, 1)[0];
      const finalImages = cover ? [cover, ...ordered] : ordered;
      finalImages.forEach((image) => formDataToSend.append("images", image));

      const response = await apiFetch<any>("/properties", {
        method: "POST",
        body: formDataToSend,
      });

      if (response?.success) {
        const created =
          response?.property ||
          response?.data?.property ||
          response?.data ||
          response?.item ||
          response?.result;

        const id = created?._id || created?.id || response?.propertyId || "";
        if (!id) {
          setError("Created but could not read Property ID from response.");
        } else {
          setCreatedPropertyId(String(id));
          // resetAfterSuccess();
        }
      } else {
        setError(response?.message || "Failed to create property");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create property");
    } finally {
      setLoading(false);
    }
  };

  const landmarkValue = String(formData.landmark || "").trim();
  const landmarkIsLink = landmarkValue.startsWith("http");
  const landmarkIsCoord = isLatLng(landmarkValue);
  const hasOffer = formData.offerCategory !== "none";
  const hasDiscount =
    hasOffer &&
    (formData.offerDiscountType === "percentage" ||
      formData.offerDiscountType === "fixed");

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

        {/* ✅ Success section showing Property ID */}
        {createdPropertyId && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-extrabold text-emerald-900">
                  Property Created Successfully ✅
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  Property ID:{" "}
                  <span className="font-mono font-bold">{createdPropertyId}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyText(createdPropertyId)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  Copy ID
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(`/seller/edit-property/${createdPropertyId}`)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  Edit Now
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(`/buyer/property/${createdPropertyId}?preview=1`)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                  title="Open buyer property details page"
                >
                  <ExternalLink className="h-4 w-4" />
                  View as Buyer
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/seller/my-properties")}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Go to My Properties
                </button>
              </div>
            </div>
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
              <label className="block text-sm font-semibold text-slate-800">
                Beds
              </label>
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
              <label className="block text-sm font-semibold text-slate-800">
                Baths
              </label>
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
              <label className="block text-sm font-semibold text-slate-800">
                Sqft
              </label>
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
              <label className="block text-sm font-semibold text-slate-800">
                Floor
              </label>
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
              <label className="block text-sm font-semibold text-slate-800">
                Facing
              </label>
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

            {/* Google Map */}
            <div>
              <label className="block text-sm font-semibold text-slate-800">
                Google Map (optional)
              </label>

              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Paste Google Maps share link OR lat,lng"
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={openGoogleMapsPicker}
                  disabled={loading}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                  title="Open Google Maps and pick the exact location"
                >
                  <ExternalLink className="h-4 w-4" />
                  Pick
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={pasteFromClipboard}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                  title="Paste copied Google Maps link"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Paste
                </button>

                {/* ✅ Convert link -> lat,lng */}
                <button
                  type="button"
                  onClick={convertLandmarkToLatLng}
                  disabled={loading || !landmarkValue || landmarkIsCoord}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  title="Convert a Google Maps link to coordinates (lat,lng)"
                >
                  <Wand2 className="h-4 w-4" />
                  Convert to lat,lng
                </button>

                {landmarkIsLink && (
                  <button
                    type="button"
                    onClick={() =>
                      window.open(formData.landmark, "_blank", "noopener,noreferrer")
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Preview link
                  </button>
                )}

                <p className="text-xs text-slate-500">
                  Best: store coordinates like <b>27.6663,85.3302</b> for perfect
                  embed map on buyer page.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="mb-3 text-sm font-semibold text-emerald-900">
              Property Offer
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-800">
                  Offer Category
                </label>
                <select
                  name="offerCategory"
                  value={formData.offerCategory}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
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
                  disabled={loading || !hasOffer}
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
                  <label className="block text-sm font-semibold text-slate-800">
                    Offer Title
                  </label>
                  <input
                    type="text"
                    name="offerTitle"
                    value={formData.offerTitle}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="e.g., Dashain Special Discount"
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Offer Badge
                  </label>
                  <input
                    type="text"
                    name="offerBadge"
                    value={formData.offerBadge}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="e.g., Save 15%"
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Offer Description
                  </label>
                  <textarea
                    name="offerDescription"
                    value={formData.offerDescription}
                    onChange={handleChange}
                    rows={3}
                    disabled={loading}
                    placeholder="Short offer details for cards and property detail page."
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Discount Type
                  </label>
                  <select
                    name="offerDiscountType"
                    value={formData.offerDiscountType}
                    onChange={handleChange}
                    disabled={loading}
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  >
                    {OFFER_DISCOUNT_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    name="offerDiscountValue"
                    value={formData.offerDiscountValue}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    disabled={loading || !hasDiscount}
                    placeholder={
                      formData.offerDiscountType === "percentage" ? "e.g., 10" : "e.g., 5000"
                    }
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    name="offerValidUntil"
                    value={formData.offerValidUntil}
                    onChange={handleChange}
                    disabled={loading}
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  />
                </div>
              </div>
            )}
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
                      <img
                        src={src}
                        alt={`upload-${idx}`}
                        className="h-28 w-full object-cover"
                      />

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

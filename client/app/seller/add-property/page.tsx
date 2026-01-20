"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function SellerAddPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
  const [images, setImages] = useState<File[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formDataToSend = new FormData();
      
      // Append all text fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      // Append images with key "images" (must match backend upload.array("images", 6))
      images.forEach((image) => {
        formDataToSend.append("images", image);
      });

      const response = await apiFetch<{success: boolean; property: any}>("/properties", {
        method: "POST",
        body: formDataToSend, // FormData (NOT JSON)
      });

      if (response.success) {
        // Redirect to /seller/my-properties after successful creation
        router.push("/seller/my-properties");
      } else {
        setError("Failed to create property");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create property");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-emerald-50 px-6 py-8">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900">Add Property</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create a new property listing.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Price *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Location *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                placeholder="e.g., Kathmandu, Nepal"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Full address"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Beds</label>
              <input
                type="number"
                name="beds"
                value={formData.beds}
                onChange={handleChange}
                min="0"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Baths</label>
              <input
                type="number"
                name="baths"
                value={formData.baths}
                onChange={handleChange}
                min="0"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Sqft</label>
              <input
                type="number"
                name="sqft"
                value={formData.sqft}
                onChange={handleChange}
                min="0"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Property Type</label>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="condo">Condo</option>
                <option value="land">Land</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
          </div>

          {/* Listing Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Listing Type</label>
            <select
              name="listingType"
              value={formData.listingType}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="buy">For Sale</option>
              <option value="rent">For Rent</option>
            </select>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Images * (up to 6)</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {images.length > 0 && (
              <p className="mt-2 text-sm text-slate-600">
                {images.length} image(s) selected
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-slate-700 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Property"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

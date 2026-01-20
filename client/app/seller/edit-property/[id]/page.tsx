"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { ArrowLeft, Upload, X } from "lucide-react";

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

export default function SellerEditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<File[]>([]);
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

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await apiFetch<{ success: boolean; property: Property }>(`/properties/mine/${params.id}`);
        if (response.success) {
          setProperty(response.property);
          setFormData({
            title: response.property.title,
            description: response.property.description,
            price: response.property.price.toString(),
            currency: response.property.currency,
            location: response.property.location,
            address: response.property.address,
            beds: response.property.beds.toString(),
            baths: response.property.baths.toString(),
            sqft: response.property.sqft.toString(),
            propertyType: response.property.propertyType,
            listingType: response.property.listingType,
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to load property");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProperty();
    }
  }, [params.id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files].slice(0, 6)); // Max 6 images
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
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

      const response = await apiFetch<{success: boolean; property: any}>(`/properties/${params.id}`, {
        method: "PATCH",
        body: formDataToSend, // FormData (NOT JSON)
      });

      if (response.success) {
        // Redirect to property view after successful update
        router.push(`/seller/property/${params.id}`);
      } else {
        setError("Failed to update property");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update property");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 px-6 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-r-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="min-h-screen bg-emerald-50 px-6 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Property Details
          </button>
        </div>

        {/* Form */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-6">Edit Property</h1>
          
          {property && (
            <p className="text-sm text-amber-600 mb-4">
              Note: Editing this property will reset its status to "pending" for admin re-approval.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Property Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Beautiful 3BHK House"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Kathmandu, Nepal"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Describe your property..."
              />
            </div>

            {/* Price and Currency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="500000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="USD">USD</option>
                  <option value="NPR">NPR</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bedrooms
                </label>
                <input
                  type="number"
                  value={formData.beds}
                  onChange={(e) => setFormData(prev => ({ ...prev, beds: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bathrooms
                </label>
                <input
                  type="number"
                  value={formData.baths}
                  onChange={(e) => setFormData(prev => ({ ...prev, baths: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Square Feet
                </label>
                <input
                  type="number"
                  value={formData.sqft}
                  onChange={(e) => setFormData(prev => ({ ...prev, sqft: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="1200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Property Type
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => setFormData(prev => ({ ...prev, propertyType: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="123 Main Street, Kathmandu"
              />
            </div>

            {/* Listing Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Listing Type
              </label>
              <select
                value={formData.listingType}
                onChange={(e) => setFormData(prev => ({ ...prev, listingType: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="buy">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Images (Optional - Add new images)
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-sm text-slate-600">Click to upload images</span>
                  <span className="text-xs text-slate-500 mt-1">PNG, JPG up to 8MB each (Max 6 images)</span>
                </label>
              </div>

              {/* Image Preview */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Existing Images */}
              {property?.images && property.images.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-slate-600 mb-2">Current images:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {property.images.map((image, index) => (
                      <img
                        key={index}
                        src={image.url}
                        alt={`Current ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Update Property"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

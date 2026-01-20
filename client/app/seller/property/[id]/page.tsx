"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { ArrowLeft, Edit, MapPin, Bed, Bath, Square, DollarSign } from "lucide-react";

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
  createdAt: string;
};

export default function SellerViewPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await apiFetch<{ success: boolean; property: Property }>(`/properties/mine/${params.id}`);
        if (response.success) {
          setProperty(response.property);
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

  if (error || !property) {
    return (
      <div className="min-h-screen bg-emerald-50 px-6 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-red-600">{error || "Property not found"}</p>
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
            Back to My Properties
          </button>
        </div>

        {/* Property Card */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
          {/* Images */}
          <div className="aspect-video bg-slate-100">
            {property.images?.length > 0 ? (
              <img
                src={property.images[0].url}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                No image available
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Title and Status */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{property.title}</h1>
                <div className="flex items-center gap-2 mt-2 text-slate-600">
                  <MapPin className="h-4 w-4" />
                  <span>{property.location}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                  property.status === "active" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                  property.status === "pending" ? "bg-amber-100 text-amber-800 border-amber-200" :
                  property.status === "rejected" ? "bg-red-100 text-red-800 border-red-200" :
                  "bg-slate-100 text-slate-800 border-slate-200"
                }`}>
                  {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                </span>
                <button 
                  onClick={() => router.push(`/seller/edit-property/${property._id}`)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Property
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <span className="text-3xl font-bold text-slate-900">
                  {property.currency} {property.price.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Bed className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="text-sm text-slate-600">Bedrooms</p>
                  <p className="font-semibold text-slate-900">{property.beds}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Bath className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="text-sm text-slate-600">Bathrooms</p>
                  <p className="font-semibold text-slate-900">{property.baths}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Square className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="text-sm text-slate-600">Square Feet</p>
                  <p className="font-semibold text-slate-900">{property.sqft.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Description</h2>
              <p className="text-slate-600 leading-relaxed">
                {property.description || "No description provided"}
              </p>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Property Type</p>
                <p className="font-medium text-slate-900 capitalize">{property.propertyType}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Listing Type</p>
                <p className="font-medium text-slate-900 capitalize">{property.listingType}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Address</p>
                <p className="font-medium text-slate-900">{property.address || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Listed on</p>
                <p className="font-medium text-slate-900">
                  {new Date(property.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

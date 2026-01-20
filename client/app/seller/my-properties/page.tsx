"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, Plus, Eye, Edit, Trash2, Home, Calendar, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { apiFetch } from "@/app/lib/api";

interface Property {
  _id: string;
  title: string;
  location: string;
  price: number;
  status: "active" | "pending" | "draft" | "rejected";
  views: number;
  leads: number;
  listingType: string;
  beds: number;
  baths: number;
  sqft: number;
  images: { url: string; publicId: string }[];
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  items: Property[];
  total: number;
  page: number;
  limit: number;
}

const statusColors = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200", 
  draft: "bg-slate-100 text-slate-800 border-slate-200",
  rejected: "bg-red-100 text-red-800 border-red-200"
};

export default function SellerMyPropertiesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch properties on component mount and when filters change
  useEffect(() => {
    fetchProperties();
  }, [searchTerm, filterStatus]);

  // Also fetch on component mount to ensure new properties appear
  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError("");
      
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append("search", searchTerm);
      if (filterStatus !== "all") queryParams.append("status", filterStatus);
      
      const response = await apiFetch<ApiResponse>(`/properties/mine?${queryParams.toString()}`);
      
      if (response.success) {
        // Normalize data to ensure safe defaults
        const normalizedProperties = (response.items || []).map(property => ({
          ...property,
          views: property.views || 0,
          leads: property.leads || 0,
          status: property.status || 'pending'
        }));
        setProperties(normalizedProperties);
      } else {
        setError("Failed to fetch properties");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch properties");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (propertyId: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;
    
    try {
      const response = await apiFetch<{success: boolean}>(`/properties/${propertyId}`, {
        method: "DELETE"
      });
      
      if (response.success) {
        // Refresh the properties list
        fetchProperties();
      } else {
        setError("Failed to delete property");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete property");
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || property.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <main className="min-h-screen bg-[#F6FAF8]">
      {/* Subtle gradient strip behind header */}
      <div className="h-32 bg-gradient-to-b from-emerald-50 via-transparent to-transparent"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto max-w-6xl px-6 -mt-20"
      >
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">My Properties</h1>
          <p className="text-sm text-slate-500">Manage your property listings and track their performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Listings", value: properties.length, icon: Home, color: "bg-blue-500" },
            { label: "Active", value: properties.filter(p => p.status === "active").length, icon: TrendingUp, color: "bg-emerald-500" },
            { label: "Total Views", value: properties.reduce((sum, p) => sum + p.views, 0), icon: Eye, color: "bg-purple-500" },
            { label: "Total Leads", value: properties.reduce((sum, p) => sum + p.leads, 0), icon: Calendar, color: "bg-orange-500" }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">{stat.value}</span>
              </div>
              <p className="text-sm font-medium text-slate-600">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Search and Filters Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search properties by title or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder-slate-500 transition-all text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 bg-white transition-all text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
                <option value="rejected">Rejected</option>
              </select>
              <button 
                onClick={() => router.push("/seller/add-property")}
                className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Property
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-r-2 border-emerald-600"></div>
          </div>
        )}

        {/* Properties Table */}
        {!loading && !error && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Property</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Price</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Views</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Leads</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProperties.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                        No properties found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProperties.map((property, index) => (
                      <motion.tr
                        key={property._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ backgroundColor: "#f8fafc", transition: { duration: 0.2 } }}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={property.images?.[0]?.url || "/placeholder-house.jpg"}
                              alt={property.title}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{property.title}</p>
                              <p className="text-xs text-slate-500">{property.location}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[property.status]}`}>
                            {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-slate-500" />
                            <span className="font-medium text-slate-900 text-sm">{property.price.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{(property.views || 0).toLocaleString()}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{property.leads || 0}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => router.push(`/seller/property/${property._id}`)}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 transition-colors" 
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => router.push(`/seller/edit-property/${property._id}`)}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 transition-colors" 
                              title="Edit Property"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(property._id)}
                              className="p-1.5 text-slate-600 hover:text-red-600 transition-colors" 
                              title="Delete Property"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </main>
  );
}

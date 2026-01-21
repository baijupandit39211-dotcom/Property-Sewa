"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import BuyerHeader from "../../../../components/buyer/BuyerHeader";
import BuyerSidebar from "../../../../components/buyer/BuyerSidebar";
import { apiFetch } from "../../../lib/api";
import type { Property } from "../../../lib/property.types";

export default function PropertyDetailsPage() {
  const params = useParams<{ id?: string }>();
  const id = useMemo(() => (params?.id ? String(params.id) : ""), [params]);

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const [visitRequested, setVisitRequested] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [visitForm, setVisitForm] = useState({
    requestedDate: "",
    preferredTime: "",
    message: "",
  });

  useEffect(() => {
    if (!id) return;

    setLoading(true);

    apiFetch<{ success: boolean; property: Property }>(`/properties/${id}`)
      .then((res) => setProperty(res.property))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    // Fetch current user info for Contact Agent form
    apiFetch<{ success: boolean; user: { name: string; email: string } }>("/auth/me")
      .then((res) => {
        if (res.success && res.user) {
          setUser({ name: res.user.name, email: res.user.email });
        }
      })
      .catch(() => {
        // User not authenticated, but still allow contact
      });
  }, []);

  const handleContactAgent = async () => {
    if (!message.trim()) return;
    
    setSubmitting(true);
    try {
      console.log("Sending lead request:", {
        propertyId: id,
        name: user?.name || "",
        email: user?.email || "",
        message: message.trim(),
      });
      
      const response = await apiFetch("/leads", {
        method: "POST",
        body: JSON.stringify({
          propertyId: id,
          name: user?.name || "",
          email: user?.email || "",
          message: message.trim(),
        }),
      });
      
      console.log("Lead response:", response);
      
      setShowModal(false);
      setMessage("");
      alert("Message sent successfully! The agent will contact you soon.");
    } catch (err: any) {
      console.error("Lead creation error:", err);
      alert(err.message || "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestVisit = async () => {
    if (!visitForm.requestedDate || !visitForm.preferredTime) {
      alert("Please select both date and preferred time for the visit.");
      return;
    }
    
    setVisitSubmitting(true);
    try {
      const response = await apiFetch<{ success: boolean; visit: any }>("/visits", {
        method: "POST",
        body: JSON.stringify({
          propertyId: id,
          requestedDate: visitForm.requestedDate,
          preferredTime: visitForm.preferredTime,
          message: visitForm.message,
        }),
      });
      
      if (response.success) {
        setShowVisitModal(false);
        setVisitRequested(true);
        setVisitForm({ requestedDate: "", preferredTime: "", message: "" });
        alert("Visit request sent successfully! The seller will respond soon.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to send visit request");
    } finally {
      setVisitSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50">
      <BuyerHeader />

      <div className="flex">
        <BuyerSidebar />

        <main className="w-full px-10 py-8">
          {loading && (
            <div className="rounded-2xl bg-white p-6 text-sm text-zinc-600 ring-1 ring-black/5">
              Loading property...
            </div>
          )}

          {!loading && !property && (
            <div className="rounded-2xl bg-white p-6 text-sm text-red-600 ring-1 ring-black/5">
              Property not found.
            </div>
          )}

          {property && (
            <>
              {/* top action buttons */}
              <div className="flex justify-end gap-3">
                <button className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white">
                  Add to Wishlist
                </button>
                <button className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white">
                  Share
                </button>
              </div>

              {/* banner image */}
              <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    property.images?.[0]?.url ||
                    "https://via.placeholder.com/1200x600?text=No+Image"
                  }
                  alt={property.title}
                  className="h-[240px] w-full object-cover"
                />
              </div>

              {/* title + price */}
              <h1 className="mt-8 text-3xl font-extrabold text-zinc-900">
                {property.title}
              </h1>

              <div className="mt-2 text-2xl font-extrabold text-emerald-700">
                {property.currency} {Number(property.price).toLocaleString()}
              </div>

              <div className="mt-2 text-sm text-emerald-700">
                {property.beds} Beds · {property.baths} Baths · {property.sqft} sqft
              </div>

              <div className="mt-2 text-sm text-zinc-600">
                {property.address || property.location}
              </div>

              <p className="mt-6 max-w-[760px] text-sm leading-6 text-zinc-700">
                {property.description || "No description provided."}
              </p>

              {/* tabs (UI only for now) */}
              <div className="mt-6 flex flex-wrap gap-6 border-b border-emerald-200 text-sm">
                <button className="border-b-2 border-emerald-700 pb-3 font-semibold text-emerald-900">
                  Overview
                </button>
                <button className="pb-3 text-emerald-700 hover:text-emerald-900">
                  Amenities & Floor Plans
                </button>
                <button className="pb-3 text-emerald-700 hover:text-emerald-900">
                  Photos
                </button>
                <button className="pb-3 text-emerald-700 hover:text-emerald-900">
                  Location & Insights
                </button>

                <div className="ml-auto flex gap-3 pb-3">
                  <button 
                    onClick={() => setShowVisitModal(true)}
                    disabled={visitRequested}
                    className={`rounded-xl px-5 py-2 text-sm font-semibold ${
                      visitRequested 
                        ? "bg-gray-400 text-white cursor-not-allowed" 
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {visitRequested ? "Visit Requested" : "Request Visit"}
                  </button>
                  <button 
                    onClick={() => setShowModal(true)}
                    className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-black/5 hover:bg-emerald-50"
                  >
                    Contact Agent
                  </button>
                </div>
              </div>

              {/* Similar properties can come later */}
            </>
          )}
        </main>
      </div>

      {/* Contact Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Agent</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="I'm interested in this property. Please provide more information..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleContactAgent}
                disabled={submitting || !message.trim()}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Request Visit</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Visit Date *
                </label>
                <input
                  type="date"
                  value={visitForm.requestedDate}
                  onChange={(e) => setVisitForm(prev => ({ ...prev, requestedDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  min={(() => {
                    const date = new Date();
                    return date.getFullYear() + '-' + 
                      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(date.getDate()).padStart(2, '0');
                  })()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Preferred Time *
                </label>
                <input
                  type="time"
                  value={visitForm.preferredTime}
                  onChange={(e) => setVisitForm(prev => ({ ...prev, preferredTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={visitForm.message}
                  onChange={(e) => setVisitForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Any specific requirements or questions for the visit..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowVisitModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestVisit}
                disabled={visitSubmitting || !visitForm.requestedDate || !visitForm.preferredTime}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {visitSubmitting ? "Requesting..." : "Request Visit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

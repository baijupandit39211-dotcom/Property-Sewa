import BuyerSidebar from "../../../components/buyer/BuyerSidebar";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { Mail, Phone, MessageSquare, Send } from "lucide-react";

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch property data
        const propertyResponse = await apiFetch<{ success: boolean; property: any }>(`/properties/${params.id}`);
        if (propertyResponse.success) {
          setProperty(propertyResponse.property);
        }

        // Fetch user data for auto-fill
        const userResponse = await apiFetch<{ success: boolean; user: any }>("/auth/me");
        if (userResponse.success) {
          setUser(userResponse.user);
          setFormData(prev => ({
            ...prev,
            name: userResponse.user.name || "",
            email: userResponse.user.email || "",
          }));
        }
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Guard: ensure property exists
    if (!property?._id) {
      setError("Property not loaded. Please refresh the page.");
      return;
    }
    
    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const response = await apiFetch<{ success: boolean; lead: any }>("/leads", {
        method: "POST",
        body: JSON.stringify({
          propertyId: property._id,
          ...formData,
        }),
      });

      if (response.success) {
        setSuccess(true);
        setFormData(prev => ({ ...prev, message: "" })); // Keep name/email, clear message
        
        // Verify lead was created by refetching inquiries
        try {
          const inquiriesResponse = await apiFetch<{ success: boolean; items: any[] }>("/leads/my-inquiries");
          if (inquiriesResponse.success) {
            console.log("Lead created successfully. Total inquiries:", inquiriesResponse.items.length);
          }
        } catch (verifyErr) {
          console.error("Failed to verify lead creation:", verifyErr);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to send inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <div className="mx-auto max-w-4xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-r-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-emerald-50">
      <div className="flex">
        <BuyerSidebar />

        <main className="w-full px-10 py-8">
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
                property?.images?.[0]?.url ||
                "https://via.placeholder.com/1200x600?text=No+Image"
              }
              alt={property?.title || "Property"}
              className="h-[240px] w-full object-cover"
            />
          </div>

          {/* title + price */}
          <h1 className="mt-8 text-3xl font-extrabold text-zinc-900">
            {property?.title || "Property"}
          </h1>

          <div className="mt-2 text-2xl font-extrabold text-emerald-700">
            {property?.currency || "Rs"} {Number(property?.price || 0).toLocaleString()}
          </div>

          <div className="mt-2 text-sm text-emerald-700">
            {property?.beds || 0} Beds · {property?.baths || 0} Baths · {property?.sqft || 0} sqft
          </div>

          <div className="mt-2 text-sm text-zinc-600">
            {property?.address || property?.location || "Location"}
          </div>

          <p className="mt-6 max-w-[760px] text-sm leading-6 text-zinc-700">
            {property?.description || "No description provided."}
          </p>

          {/* Inquiry Form */}
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Make an Inquiry</h3>
            
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">Your inquiry has been sent successfully! The seller will contact you soon.</p>
              </div>
            )}

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Message *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="I'm interested in this property. Please provide more information..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-r-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Inquiry
                  </>
                )}
              </button>
            </form>
          </div>

          {/* tabs */}
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
              <button className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white">
                Schedule Visit
              </button>
              <button className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-black/5 hover:bg-emerald-50">
                Contact Agent
              </button>
            </div>
          </div>

          {/* overview content */}
          <h2 className="mt-10 text-3xl font-extrabold text-zinc-900">
            Overview
          </h2>

          <h3 className="mt-6 text-lg font-bold text-zinc-900">Details</h3>
          <p className="mt-3 max-w-[900px] text-sm leading-6 text-zinc-700">
            Welcome to this stunning 4-bedroom, 3-bathroom home nestled in the heart
            of the desirable Willow Creek neighborhood. This meticulously maintained
            residence offers a perfect blend of modern amenities and classic charm,
            making it an ideal sanctuary for families and individuals alike...
          </p>

          {/* similar properties */}
          <h3 className="mt-14 text-lg font-bold text-zinc-900">
            Similar Properties
          </h3>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80"
                  alt="similar"
                  className="h-[150px] w-full object-cover"
                />
                <div className="p-4">
                  <div className="text-sm font-semibold text-zinc-900">
                    Charming 3-Bedroom Home
                  </div>
                  <div className="mt-2 text-xs text-emerald-700">
                    $750,000 | 3 Beds | 2 Baths | 1800 sq ft | San Francisco
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

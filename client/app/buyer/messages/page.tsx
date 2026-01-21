"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { MessageCircle, Calendar, User } from "lucide-react";

type Lead = {
  _id: string;
  propertyId: {
    _id: string;
    title: string;
    location: string;
  };
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  createdAt: string;
  latestVisitStatus?: "requested" | "confirmed" | "rejected" | "rescheduled" | "completed";
  latestVisitDate?: string;
};

export default function BuyerMessagesPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        const response = await apiFetch<{ success: boolean; items: Lead[] }>("/leads/my-inquiries");
        if (response.success) {
          setLeads(response.items || []);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch inquiries");
      } finally {
        setLoading(false);
      }
    };

    fetchInquiries();
  }, []);

  const getVisitStatusColor = (status: string) => {
    switch (status) {
      case "requested":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "rescheduled":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getInquiryStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "contacted":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "closed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getDisplayStatus = (lead: Lead) => {
    if (lead.latestVisitStatus) {
      return {
        type: "visit",
        status: lead.latestVisitStatus,
        color: getVisitStatusColor(lead.latestVisitStatus),
        label: lead.latestVisitStatus.charAt(0).toUpperCase() + lead.latestVisitStatus.slice(1)
      };
    } else {
      return {
        type: "inquiry",
        status: lead.status,
        color: getInquiryStatusColor(lead.status),
        label: lead.status.charAt(0).toUpperCase() + lead.status.slice(1)
      };
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-emerald-50 px-6 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-r-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading inquiries...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-emerald-50 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">My Inquiries</h1>
          <p className="mt-2 text-sm text-slate-600">
            Track your property inquiries and conversations with sellers.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No inquiries yet. When you contact sellers about properties, they'll appear here.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const displayStatus = getDisplayStatus(lead);
                    return (
                      <tr 
                        key={lead._id} 
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => router.push(`/buyer/messages/${lead._id}`)}
                      >
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-slate-900">{lead.propertyId?.title || "Unknown Property"}</p>
                            <p className="text-sm text-slate-600">{lead.propertyId?.location || "Unknown Location"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="max-w-xs">
                            <p className="text-sm text-slate-600 line-clamp-3">{lead.message}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${displayStatus.color}`}>
                              {displayStatus.label}
                            </span>
                            {displayStatus.type === "visit" && (
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                Visit
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

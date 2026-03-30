"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import {
  Calendar,
  ChevronRight,
  MessageCircle,
  Search,
  User,
} from "lucide-react";

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
        label: lead.latestVisitStatus.charAt(0).toUpperCase() + lead.latestVisitStatus.slice(1),
      };
    } else {
      return {
        type: "inquiry",
        status: lead.status,
        color: getInquiryStatusColor(lead.status),
        label: lead.status.charAt(0).toUpperCase() + lead.status.slice(1),
      };
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-[32px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                Buyer inbox
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">My inquiries</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                Track your seller conversations, inquiry progress, and visit updates in one place.
              </p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm"
              >
                <div className="mb-3 h-4 w-28 animate-pulse rounded bg-slate-200" />
                <div className="h-9 w-20 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-4 w-40 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] shadow-sm">
            <div className="space-y-4 px-6 py-6">
              {[...Array(5)].map((_, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-emerald-100 bg-white px-5 py-5 shadow-sm"
                >
                  <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="mb-2 h-5 w-56 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                <MessageCircle className="h-3.5 w-3.5" />
                Buyer inbox
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">My inquiries</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                Track your seller conversations, inquiry progress, and visit updates from one polished message workspace.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Current status
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{leads.length}</div>
              <div className="mt-1 text-sm text-white/80">Active inquiry threads</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">Total inquiries</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{leads.length}</p>
                <p className="mt-2 text-sm text-slate-500">All inquiry threads available to you.</p>
              </div>
              <div className="rounded-2xl bg-[linear-gradient(135deg,#18794e_0%,#72d6ab_100%)] p-3 text-white shadow-sm">
                <MessageCircle className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">Visit-linked</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {leads.filter((lead) => !!lead.latestVisitStatus).length}
                </p>
                <p className="mt-2 text-sm text-slate-500">Threads that already have visit activity.</p>
              </div>
              <div className="rounded-2xl bg-[linear-gradient(135deg,#18794e_0%,#72d6ab_100%)] p-3 text-white shadow-sm">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">Open threads</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {leads.filter((lead) => lead.status !== "closed").length}
                </p>
                <p className="mt-2 text-sm text-slate-500">Inquiry conversations still in progress.</p>
              </div>
              <div className="rounded-2xl bg-[linear-gradient(135deg,#18794e_0%,#72d6ab_100%)] p-3 text-white shadow-sm">
                <Search className="h-5 w-5" />
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-[28px] border border-rose-200 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f8_100%)] p-4 shadow-sm">
            <p className="font-semibold text-rose-800">{error}</p>
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100/80 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent conversations</h2>
              <p className="mt-1 text-sm text-slate-500">
                Open a thread to continue talking with the seller.
              </p>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              {leads.length} thread{leads.length === 1 ? "" : "s"}
            </div>
          </div>

          {leads.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[24px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <MessageCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">No inquiries yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                When you contact sellers about properties, your conversations will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4 px-6 py-6">
              {leads.map((lead) => {
                const displayStatus = getDisplayStatus(lead);
                return (
                  <button
                    key={lead._id}
                    type="button"
                    className="flex w-full items-start gap-4 rounded-[24px] border border-emerald-100 bg-white px-5 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50/50"
                    onClick={() => router.push(`/buyer/messages/${lead._id}`)}
                  >
                    <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                      <User className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-bold text-slate-900">
                              {lead.propertyId?.title || "Unknown Property"}
                            </p>
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${displayStatus.color}`}>
                              {displayStatus.label}
                            </span>
                            {displayStatus.type === "visit" && (
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                Visit
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm font-medium text-slate-500">
                            {lead.propertyId?.location || "Unknown Location"}
                          </p>

                          <div className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 line-clamp-3">
                            {lead.message}
                          </div>
                        </div>

                        <div className="flex flex-col items-start gap-3 lg:items-end">
                          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </div>
                          <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                            Open thread
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Clock3, MapPin, XCircle } from "lucide-react";
import { apiFetch } from "@/app/lib/api";

type VisitStatus =
  | "requested"
  | "confirmed"
  | "rescheduled"
  | "rejected"
  | "cancelled"
  | "completed"
  | "no_show";

type Visit = {
  _id: string;
  propertyId?: { _id: string; title: string; location: string; images?: Array<{ url?: string }> } | null;
  sellerId?: { _id: string; name: string; email?: string; phone?: string } | null;
  leadId?: { _id: string } | null;
  status: VisitStatus;
  visitType?: "in_person" | "virtual" | "site_tour";
  preferredDate?: string;
  preferredTimeSlot?: string;
  actualDate?: string;
  actualTime?: string;
  buyerMessage?: string;
  sellerNote?: string;
  createdAt: string;
};

function tone(status: VisitStatus) {
  if (status === "confirmed" || status === "rescheduled") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "requested") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "completed") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function visitTypeLabel(type?: Visit["visitType"]) {
  if (type === "virtual") return "Virtual Tour";
  if (type === "site_tour") return "Site Tour";
  return "Physical Visit";
}

function formatVisitDateTime(value: string, time: string) {
  const dateText = new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const [hoursRaw = "0", minutesRaw = "0"] = String(time || "").split(":");
  const clock = new Date();
  clock.setHours(Number(hoursRaw), Number(minutesRaw), 0, 0);
  const timeText = clock.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateText} at ${timeText}`;
}

export default function BuyerScheduledVisitsPage() {
  const [items, setItems] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; items: Visit[] }>("/api/visits/my?limit=50");
      setItems(res.items || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load visits");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeCount = useMemo(
    () => items.filter((v) => ["requested", "confirmed", "rescheduled"].includes(v.status)).length,
    [items]
  );

  const handleCancel = async (id: string) => {
    try {
      await apiFetch(`/api/visits/${id}/cancel`, { method: "PATCH" });
      await load();
    } catch {}
  };

  const handleReschedule = async (id: string) => {
    try {
      await apiFetch(`/api/visits/${id}/request-reschedule`, {
        method: "PATCH",
        body: JSON.stringify({ buyerMessage: "Please suggest an alternate time." }),
      });
      await load();
    } catch {}
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f3fff8_0%,#edf8f1_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[28px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            <CalendarClock className="h-3.5 w-3.5" />
            Buyer Visits
          </div>
          <h1 className="mt-4 text-3xl font-extrabold">Scheduled Visits</h1>
          <p className="mt-2 text-sm font-medium text-emerald-50/90">{activeCount} active visit request(s)</p>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-emerald-100 bg-white p-6">Loading...</div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-emerald-100 bg-white p-10 text-center text-slate-600">
            No scheduled visits yet.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((visit) => {
              const date = visit.actualDate || visit.preferredDate || visit.createdAt;
              const time = visit.actualTime || visit.preferredTimeSlot || "Time pending";
              const propertyHref = visit.propertyId?._id ? `/buyer/property/${visit.propertyId._id}` : "/buyer/search-properties";
              const messageHref = visit.leadId?._id ? `/buyer/messages/${visit.leadId._id}` : "/buyer/messages";
              const imageUrl = visit.propertyId?.images?.[0]?.url || "";
              return (
                <article
                  key={visit._id}
                  className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
                >
                  <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={visit.propertyId?.title || "Property"}
                          className="h-[150px] w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = "/placeholder.jpg";
                          }}
                        />
                      ) : (
                        <div className="grid h-[150px] place-items-center text-center">
                          <div>
                            <MapPin className="mx-auto h-5 w-5 text-[#316249]" />
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#587864]">
                              Property Image
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="text-xl font-bold text-slate-900">{visit.propertyId?.title || "Property"}</h3>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${tone(visit.status)}`}>
                          {visit.status}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm font-medium text-slate-700 sm:grid-cols-2">
                        <div>
                          <span className="font-semibold text-slate-600">Visit type:</span>{" "}
                          <span className="font-semibold text-slate-800">{visitTypeLabel(visit.visitType)}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-600">Seller/Agent:</span>{" "}
                          <span className="font-semibold text-slate-800">{visit.sellerId?.name || "Seller"}</span>
                        </div>
                        <div className="inline-flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <span className="font-semibold text-slate-600">Location:</span>{" "}
                          <span className="font-semibold text-slate-800">{visit.propertyId?.location || "Location not set"}</span>
                        </div>
                        <div className="inline-flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-slate-500" />
                          <span className="font-semibold text-slate-800">{formatVisitDateTime(date, time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(visit.sellerNote || visit.buyerMessage) && (
                    <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                      {visit.sellerNote || visit.buyerMessage}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={messageHref}
                      className="rounded-lg bg-[#316249] px-3 py-2 text-sm font-semibold text-white hover:bg-[#28513d]"
                    >
                      Message seller
                    </Link>
                    <Link
                      href={propertyHref}
                      className="rounded-lg border border-[#316249] px-3 py-2 text-sm font-semibold text-[#316249] hover:bg-emerald-50"
                    >
                      View property
                    </Link>
                    {["requested", "confirmed", "rescheduled"].includes(visit.status) && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReschedule(visit._id)}
                          className="rounded-lg border border-[#316249] px-3 py-2 text-sm font-semibold text-[#316249] hover:bg-emerald-50"
                        >
                          Request Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(visit._id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {visit.status === "completed" && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed
                      </span>
                    )}
                    {["rejected", "cancelled", "no_show"].includes(visit.status) && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                        <XCircle className="h-4 w-4" />
                        Closed
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

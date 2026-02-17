"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { CalendarDays, Clock3, Loader2, MapPin, ShieldCheck } from "lucide-react";

type Reservation = {
  _id: string;
  propertyId: any;
  paymentMethod: string;
  paymentStatus: string;
  reservationStatus: string;
  bookingAdvancePaisa: number;
  holdExpiresAt?: string;
  createdAt?: string;
};

function formatMoneyFromPaisa(paisa?: number, currency = "Rs") {
  if (!paisa || paisa <= 0) return `${currency} --`;
  const amount = paisa / 100;
  return `${currency} ${amount.toLocaleString()}`;
}

function formatDateTime(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function BuyerReservationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch<{ success?: boolean; data?: Reservation[]; message?: string }>(
          "/api/reservations/my"
        );

        if (res?.success === false) {
          throw new Error(res?.message || "Failed to load reservations");
        }

        setItems(res?.data || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load reservations");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const byStatus: Record<string, Reservation[]> = {};
    items.forEach((r) => {
      const key = r.reservationStatus || "unknown";
      byStatus[key] = byStatus[key] || [];
      byStatus[key].push(r);
    });
    return byStatus;
  }, [items]);

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-r-2 border-emerald-600" />
          <p className="mt-4 text-slate-600">Loading your reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Buyer Dashboard
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900">My Reservations</h1>
          <p className="mt-1 text-sm text-slate-600">
            COD and online reservations you have placed.
          </p>
        </div>
        <button
          onClick={() => router.push("/buyer")}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Back to Dashboard
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {items.length === 0 && !error && (
        <div className="mt-8 rounded-3xl bg-white p-6 text-center text-slate-600 ring-1 ring-black/5">
          No reservations yet. Reserve a property to see it here.
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 space-y-5">
          {Object.entries(grouped).map(([status, list]) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900">
                  {status.toUpperCase()}
                </span>
                <span className="text-xs text-slate-500">({list.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {list.map((r) => {
                  const property = r.propertyId || {};
                  const currency = property?.currency || "Rs";
                  const advanceDisplay = formatMoneyFromPaisa(r.bookingAdvancePaisa, currency);
                  return (
                    <div
                      key={r._id}
                      className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {r.paymentMethod} • {r.paymentStatus}
                          </p>
                          <div className="mt-1 text-lg font-extrabold text-slate-900">
                            {property?.title || "Property"}
                          </div>
                          <div className="mt-1 inline-flex items-center gap-1 text-sm text-slate-600">
                            <MapPin className="h-4 w-4" />
                            <span>{property?.address || property?.location || "Location"}</span>
                          </div>
                        </div>
                        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                          {advanceDisplay}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span>{r.reservationStatus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-slate-500" />
                          <span>Created: {formatDateTime(r.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-slate-500" />
                          <span>Hold until: {formatDateTime(r.holdExpiresAt as any)}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3 text-xs">
                        <button
                          onClick={() => router.push(`/buyer/property/${property?._id || property?.id || property}`)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-800 hover:bg-slate-50"
                        >
                          View Property
                        </button>
                        {r.paymentMethod === "ONLINE" && (
                          <button
                            onClick={() => router.push(`/buyer/property/${property?._id || property?.id || property}/payment`)}
                            className="rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700"
                          >
                            Complete Payment
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

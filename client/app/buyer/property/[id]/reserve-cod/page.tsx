"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import {
  getReservationExpiresAt,
  getReservationStatus,
} from "@/app/lib/propertyReservation";
import { reserveCod } from "@/app/lib/reservations";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";

type PropertyType = any;

const HOLD_HOURS = 1;

function formatMoney(currency: string | undefined, value: any) {
  const c = currency || "Rs";
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return `${c} --`;
  return `${c} ${n.toLocaleString()}`;
}

function calcAdvanceAmountClient(property: any) {
  const explicit = Number(property?.advanceAmount || 0);
  if (explicit > 0) return explicit;

  const listingType = String(property?.listingType || "").toLowerCase();
  if (listingType === "rent") {
    const dep = Number(property?.deposit || 0);
    if (dep > 0) return dep;
    const mr = Number(property?.monthlyRent || 0);
    return mr > 0 ? Math.round(mr * 0.2) : 0;
  }

  const price = Number(property?.price || 0);
  return price > 0 ? Math.round(price * 0.02) : 0;
}

export default function ReserveCodPage() {
  const params = useParams();
  const router = useRouter();

  const propertyId = String(params?.id || "");

  const [property, setProperty] = useState<PropertyType | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    message: "",
    preferredVisitDate: "",
  });

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Prefill visit date (optional)
  useEffect(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    setForm((prev) => ({
      ...prev,
      preferredVisitDate: prev.preferredVisitDate || `${yyyy}-${mm}-${dd}`,
    }));
  }, []);

  // Prefill user info if available
  useEffect(() => {
    (async () => {
      try {
        const me = await apiFetch<{ success?: boolean; user?: any }>("/auth/me");
        if (me?.success) {
          setForm((prev) => ({
            ...prev,
            fullName: prev.fullName || me.user?.name || "",
            phone: prev.phone || me.user?.phone || "",
          }));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Load property
  useEffect(() => {
    if (!propertyId) return;
    (async () => {
      try {
        setLoading(true);
        setPageError("");

        const res = await apiFetch<any>(`/properties/${propertyId}`);
        const p = res?.property || res?.data?.property || res?.data || res;

        if (res?.success === false && !p) {
          setPageError(res?.message || "Property not found");
          setProperty(null);
          return;
        }

        setProperty(p);
      } catch (e: any) {
        setPageError(e?.message || "Failed to load property");
        setProperty(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [propertyId]);

  const bookingAdvance = useMemo(
    () => (property ? calcAdvanceAmountClient(property) : 0),
    [property]
  );

  const priceDisplay = useMemo(() => {
    if (!property) return "";
    const listingType = String(property?.listingType || "").toLowerCase();
    const base =
      listingType === "rent"
        ? property?.monthlyRent || property?.price
        : property?.price || property?.monthlyRent;
    return formatMoney(property?.currency, base);
  }, [property]);

  const reservationStatus = getReservationStatus(property);
  const reservedUntil = getReservationExpiresAt(property)?.getTime() || 0;
  const isReservedActive = reservationStatus === "active";
  const isPaid = reservationStatus === "paid";
  const blocked = isReservedActive || isPaid;

  const reservedText = useMemo(() => {
    if (!blocked) return "";
    if (isPaid) return "This property is already booked.";
    const until =
      reservedUntil > 0
        ? `Reserved until ${new Date(reservedUntil).toLocaleString()}`
        : "This property is currently reserved.";
    return until;
  }, [blocked, isPaid, reservedUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) {
      setSubmitError("Property not found.");
      return;
    }
    if (blocked) {
      setSubmitError("This property is already reserved/booked.");
      return;
    }

    setSubmitLoading(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const res = await reserveCod({
        propertyId,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        message: form.message,
        preferredVisitDate: form.preferredVisitDate || undefined,
      });

      if (res?.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          router.push(`/buyer/property/${propertyId}`);
        }, 1200);
      } else {
        throw new Error(res?.message || "Failed to submit reservation.");
      }
    } catch (err: any) {
      setSubmitError(err?.message || "Reservation failed. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-r-2 border-emerald-600" />
          <p className="mt-4 text-slate-600">Loading reservation page...</p>
        </div>
      </div>
    );
  }

  if (pageError || !property) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <p className="font-semibold text-red-600">{pageError || "Property not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-8">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Property
                </p>
                <h1 className="text-2xl font-extrabold text-slate-900">{property?.title}</h1>
                <div className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4" />
                  <span>{property?.address || property?.location || "Location not provided"}</span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500">Price</p>
                <p className="text-2xl font-extrabold text-emerald-700">{priceDisplay}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Booking advance: {formatMoney(property?.currency, bookingAdvance)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Reserve with Cash on Delivery
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Reserve now and hold the property for 1 hour without immediate payment.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                <ShieldCheck className="h-4 w-4" />
                COD Hold
              </div>
            </div>

            {blocked && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-semibold">This property is not available for COD.</div>
                  <div className="text-xs text-amber-800/90">{reservedText}</div>
                </div>
              </div>
            )}

            {submitSuccess && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-semibold">Reservation requested</div>
                  <div className="text-xs text-emerald-800/90">
                    We&apos;ve held the property for 1 hour. You can also complete the advance
                    payment during this hold.
                  </div>
                </div>
              </div>
            )}

            {submitError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Full Name
                  </label>
                  <input
                    required
                    type="text"
                    value={form.fullName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pl-10 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      placeholder="+977 98XXXXXXXX"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Preferred Visit Date (optional)
                  </label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="date"
                      value={form.preferredVisitDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          preferredVisitDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pl-10 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Message (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, message: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    placeholder="Anything the agent should know..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitLoading || blocked}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Confirm Reservation (COD)"
                )}
              </button>
            </form>
          </div>
        </section>

        <aside className="lg:col-span-4">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">Reservation Summary</div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  COD
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Property</span>
                  <span className="max-w-[60%] text-right font-semibold text-slate-900">
                    {property?.title}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Price</span>
                  <span className="font-extrabold text-emerald-700">{priceDisplay}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Booking Advance</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(property?.currency, bookingAdvance)}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 text-slate-500" />
                  <span className="text-slate-700">
                    {property?.address || property?.location || "Address not provided"}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                <div className="text-xs font-extrabold text-emerald-900">Hold time</div>
                <p className="mt-1 text-xs text-emerald-800">
                  We hold the property for {HOLD_HOURS} hour after you submit this COD request.
                  Complete advance payment within that time if you want to lock it in immediately.
                </p>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Need changes? You can go back anytime; your form data stays on this page until you
                leave.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

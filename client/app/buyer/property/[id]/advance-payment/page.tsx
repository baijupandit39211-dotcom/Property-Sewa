"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { reserveCod } from "@/app/lib/reservations";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Wallet,
} from "lucide-react";

type PaymentMethod = "esewa" | "khalti" | "cod";

const COD_HOLD_HOURS = Number(process.env.NEXT_PUBLIC_COD_HOLD_HOURS || 12) || 12;
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/1200x700?text=No+Image";

function calcAdvanceAmount(property: any) {
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

function toTime(v: any) {
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

function primaryImage(property: any) {
  const url = property?.images?.[0]?.url;
  if (url) return url;
  return PLACEHOLDER_IMAGE;
}

export default function AdvancePaymentPage() {
  const params = useParams();
  const router = useRouter();

  const propertyId = String(params?.id || "");

  const [property, setProperty] = useState<any>(null);
  const [meId, setMeId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [method, setMethod] = useState<PaymentMethod>("esewa");
  const [payLoading, setPayLoading] = useState(false);
  const [codLoading, setCodLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [codSuccess, setCodSuccess] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    message: "",
    preferredVisitDate: "",
  });

  // Prefill visit date for COD
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

  // Load user + property
  useEffect(() => {
    if (!propertyId) return;

    (async () => {
      try {
        setLoading(true);
        setPageError("");

        try {
          const meRes = await apiFetch<{ success?: boolean; user?: any }>("/auth/me");
          if (meRes?.success) {
            setMeId(String(meRes.user?._id || meRes.user?.id || ""));
            setForm((prev) => ({
              ...prev,
              fullName: prev.fullName || meRes.user?.name || "",
              phone: prev.phone || meRes.user?.phone || "",
            }));
          }
        } catch {
          // ignore unauthenticated fetch errors
        }

        const res = await apiFetch<any>(`/properties/${propertyId}`);
        const p = res?.property || res?.data?.property || res?.data || res;

        if (res?.success === false && !p) {
          setPageError(res?.message || "Property not found");
          setProperty(null);
          return;
        }

        setProperty(p);
      } catch (e: any) {
        setPageError(e?.message || "Failed to load payment options");
        setProperty(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [propertyId]);

  const advanceAmount = useMemo(
    () => (property ? calcAdvanceAmount(property) : 0),
    [property]
  );
  const currency = property?.currency || "Rs";

  const reservationStatus = String(property?.reservationStatus || "none").toLowerCase();
  const reservedUntil = toTime(property?.reservedUntil);
  const reservedBy = property?.reservedBy ? String(property.reservedBy) : "";

  const isPaid = reservationStatus === "paid";
  const isReservedActive = reservationStatus === "reserved" && reservedUntil > Date.now();
  const isMine = !!meId && !!reservedBy && meId === reservedBy;
  const reservedByOther = isReservedActive && !isMine;

  const blocked = isPaid || reservedByOther;
  const amountMissing = Number(advanceAmount || 0) <= 0;

  const methods: {
    key: PaymentMethod;
    label: string;
    description: string;
    icon: JSX.Element;
  }[] = [
    {
      key: "esewa",
      label: "eSewa",
      description: "Instant redirect payment",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      key: "khalti",
      label: "Khalti",
      description: "Wallet checkout",
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      key: "cod",
      label: "Confirm COD (Pay Later)",
      description: "Reserve now, pay in person",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

  const methodIsOnline = method === "esewa" || method === "khalti";

  const reservedText = useMemo(() => {
    if (isPaid) return "This property is already booked.";
    if (reservedByOther) {
      const until =
        reservedUntil > 0
          ? `Reserved until ${new Date(reservedUntil).toLocaleString()} by another buyer.`
          : "Currently reserved by another buyer.";
      return until;
    }
    return "";
  }, [isPaid, reservedByOther, reservedUntil]);

  const startOnlinePayment = async (gateway: "esewa" | "khalti") => {
    try {
      if (!propertyId) return;

      if (blocked) {
        setActionError("This property is not available for payment right now.");
        return;
      }

      if (amountMissing) {
        setActionError("Advance amount is required before you can reserve this property.");
        return;
      }

      if (amountMissing) {
        setActionError("Advance amount is not set for this property.");
        return;
      }

      setPayLoading(true);
      setActionError("");

      const res = await apiFetch<any>("/payments/initiate", {
        method: "POST",
        body: JSON.stringify({ propertyId, gateway }),
      });

      if (!res?.success) throw new Error(res?.message || "Failed to initiate payment");

      if (gateway === "esewa") {
        const epayUrl =
          process.env.NEXT_PUBLIC_ESEWA_EPAY_URL ||
          "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

        const data = res?.esewa;
        if (!data) throw new Error("Invalid eSewa init response");

        const form = document.createElement("form");
        form.method = "POST";
        form.action = epayUrl;

        Object.entries(data).forEach(([k, v]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = String(v);
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        return;
      }

      alert(
        `Khalti initiated.\nPaymentId: ${res.paymentId}\n\nNext step: integrate Khalti checkout redirect/popup, then call /payments/khalti/verify with paymentId + pidx/transaction_id`
      );
    } catch (e: any) {
      setActionError(e?.message || "Payment initiation failed");
    } finally {
      setPayLoading(false);
    }
  };

  const submitCod = async () => {
    try {
      if (!propertyId) return;

      if (blocked) {
        setActionError("This property is already reserved/booked.");
        return;
      }

      if (amountMissing) {
        setActionError("Advance amount is required before you can reserve this property.");
        return;
      }

      if (!form.fullName.trim() || !form.phone.trim()) {
        setActionError("Full name and phone are required for COD.");
        return;
      }

      setCodLoading(true);
      setActionError("");

      const res = await reserveCod({
        propertyId,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        message: form.message.trim() || undefined,
        preferredVisitDate: form.preferredVisitDate || undefined,
      });

      if (!res?.success) {
        throw new Error(res?.message || "Failed to submit reservation.");
      }

      setCodSuccess(true);
      setTimeout(() => {
        router.push(`/buyer/property/${propertyId}`);
      }, 1000);
    } catch (e: any) {
      setActionError(e?.message || "Reservation failed. Please try again.");
    } finally {
      setCodLoading(false);
    }
  };

  const handleContinue = async () => {
    if (method === "cod") {
      await submitCod();
      return;
    }

    await startOnlinePayment(method as "esewa" | "khalti");
  };

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-r-2 border-emerald-600" />
          <p className="mt-4 text-slate-600">Loading payment options...</p>
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
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="h-[220px] w-full overflow-hidden">
              <img
                src={primaryImage(property)}
                alt={property?.title || "Property"}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="p-6">
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
                  <div className="text-xs font-semibold text-slate-500">Advance Amount</div>
                  <div className="text-2xl font-extrabold text-emerald-700">
                    {currency} {Number(advanceAmount || 0).toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Online payment expires in 24 hours after initiation.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Choose Payment Method</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Online payment: reservation expires if payment is not completed within 24 hours.
                  COD: reservation must be confirmed in person (shorter expiry).
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                <ShieldCheck className="h-4 w-4" />
                Secure
              </div>
            </div>

            {blocked && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>{reservedText}</div>
              </div>
            )}
            {!blocked && amountMissing && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>Advance amount is required. Please ask the seller to set an advance amount before reserving.</div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {methods.map((m) => {
                const active = method === m.key;
                const disabled = blocked;

                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      setMethod(m.key);
                      setActionError("");
                    }}
                    className={[
                      "flex h-full flex-col items-start gap-2 rounded-2xl px-4 py-4 text-left ring-1 transition",
                      active
                        ? "bg-emerald-600 text-white ring-emerald-200"
                        : "bg-white text-slate-900 ring-slate-200 hover:bg-emerald-50",
                      disabled ? "cursor-not-allowed opacity-60" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-white/10 p-2 ring-1 ring-white/30">
                        {m.icon}
                      </span>
                      <div className="text-sm font-extrabold">{m.label}</div>
                    </div>
                    <div
                      className={[
                        "text-xs",
                        active ? "text-white/90" : "text-slate-600",
                      ].join(" ")}
                    >
                      {m.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {method === "cod" && (
              <div className="mt-5 space-y-4 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                <div className="text-sm font-extrabold text-emerald-900">
                  Confirm COD Reservation
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-emerald-800">
                      Full Name
                    </label>
                    <input
                      required
                      type="text"
                      value={form.fullName}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-emerald-800">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                      <input
                        required
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 pl-10 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
                        placeholder="+977 98XXXXXXXX"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-emerald-800">
                      Preferred Visit Date (optional)
                    </label>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                      <input
                        type="date"
                        value={form.preferredVisitDate}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            preferredVisitDate: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 pl-10 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-emerald-800">
                      Message (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={form.message}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, message: e.target.value }))
                      }
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
                      placeholder="Anything the agent should know..."
                    />
                  </div>
                </div>

                <div className="text-xs text-emerald-800">
                  We hold the property for up to {COD_HOLD_HOURS} hours after you submit COD. Please
                  confirm with the agent in person to keep the reservation active.
                </div>
              </div>
            )}

            {methodIsOnline && (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-sm font-extrabold text-slate-900">Online payment</div>
                <div className="mt-1 text-xs text-slate-600">
                  We reserve the property for you for 24 hours while you complete the payment. If
                  the payment is not finished in time, the reservation will expire automatically.
                </div>
              </div>
            )}

            {actionError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {actionError}
              </div>
            )}

            {codSuccess && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-semibold">Reservation requested</div>
                  <div className="text-xs text-emerald-800/90">
                    We&apos;ve held the property. An agent will confirm your COD visit.
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleContinue}
              disabled={
                loading ||
                payLoading ||
                codLoading ||
                blocked ||
                (method === "cod" && (!form.fullName.trim() || !form.phone.trim())) ||
                amountMissing
              }
              className={[
                "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold text-white transition",
                method === "cod" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-emerald-600 hover:bg-emerald-700",
                "disabled:cursor-not-allowed disabled:opacity-60",
              ].join(" ")}
            >
              {(payLoading || codLoading) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {method === "cod" ? "Confirm COD" : "Continue"}
            </button>
          </div>
        </section>

        <aside className="lg:col-span-4">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">Summary</div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  Advance
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
                  <span className="text-slate-500">Advance Amount</span>
                  <span className="font-extrabold text-emerald-700">
                    {currency} {Number(advanceAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 text-slate-500" />
                  <span className="text-slate-700">
                    {property?.address || property?.location || "Address not provided"}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-extrabold text-slate-900">What happens next?</div>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  <li>• Online: you&apos;ll be redirected to the gateway to complete payment.</li>
                  <li>
                    • COD: we hold the property for up to {COD_HOLD_HOURS} hours until you confirm
                    in person.
                  </li>
                  <li>
                    • If payment/visit is not completed in time, the reservation automatically
                    expires.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

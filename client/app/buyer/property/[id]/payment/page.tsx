"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import {
  getReservationExpiresAt,
  getReservationOwnerId,
  getReservationStatus,
} from "@/app/lib/propertyReservation";
import { ArrowLeft, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";

type Gateway = "khalti" | "esewa";

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();

  const propertyId = String(params.id || "");

  const [property, setProperty] = useState<any>(null);
  const [amount, setAmount] = useState<number>(0);
  const [gateway, setGateway] = useState<Gateway>("esewa");

  const [meId, setMeId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState("");

  const computedFallback = useMemo(() => {
    if (!property) return 0;

    const listingType = property?.listingType;

    if (listingType === "rent") {
      const dep = Number(property?.deposit || 0);
      if (dep > 0) return dep;

      const mr = Number(property?.monthlyRent || 0);
      return mr > 0 ? Math.round(mr * 0.2) : 0;
    }

    const price = Number(property?.price || 0);
    return price > 0 ? Math.round(price * 0.02) : 0;
  }, [property]);

  useEffect(() => {
    (async () => {
      try {
        setError("");
        setLoading(true);

        try {
          const meRes = await apiFetch<{ success: boolean; user: any }>("/auth/me");
          if (meRes?.success) {
            setMeId(String(meRes?.user?._id || meRes?.user?.id || ""));
          }
        } catch {
          // ignore
        }

        const res = await apiFetch<any>(`/properties/${propertyId}`);
        const p = res?.property || res?.data?.property || res?.data || res;

        if (!res?.success && !p) {
          setError("Property not found");
          setProperty(null);
          return;
        }

        setProperty(p);

        const adv = Number(p?.advanceAmount || 0);
        setAmount(adv > 0 ? adv : 0);
      } catch (e: any) {
        setError(e?.message || "Failed to load payment details");
      } finally {
        setLoading(false);
      }
    })();
  }, [propertyId]);

  const currency = property?.currency || "Rs";
  const finalAmount = amount > 0 ? amount : computedFallback;
  const propertyImage =
    property?.images?.[0]?.url || property?.coverImage || property?.thumbnail || "/placeholder.jpg";

  const reservationStatus = getReservationStatus(property);
  const reservedBy = getReservationOwnerId(property);
  const reservedUntil = getReservationExpiresAt(property)?.getTime() || 0;

  const isReserved = reservationStatus === "active";
  const isPaid = reservationStatus === "paid";
  const isMine = !!meId && !!reservedBy && meId === reservedBy;

  const notExpired = !reservedUntil || reservedUntil > Date.now();
  const reservedByOther = isReserved && !isMine && notExpired;

  const blocked = isPaid || reservedByOther;

  const startPayment = async () => {
    try {
      if (!propertyId) return;

      if (blocked) {
        setError("This property is already reserved. You cannot pay again.");
        return;
      }

      if (!finalAmount || finalAmount <= 0) {
        setError("Advance amount is not set for this property.");
        return;
      }

      setPayLoading(true);
      setError("");

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

      if (gateway === "khalti") {
        const paymentUrl = res?.khalti?.payment_url;
        if (!paymentUrl) throw new Error("Invalid Khalti init response");
        window.location.href = String(paymentUrl);
        return;
      }
    } catch (e: any) {
      setError(e?.message || "Payment initiation failed");
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#f5f8f6] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-5 h-44 animate-pulse rounded-2xl bg-slate-100" />
            <div className="mt-6 space-y-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="h-12 w-full animate-pulse rounded-2xl bg-slate-200" />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-20 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#f5f8f6] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="mt-6 rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200">
              <Lock className="h-4 w-4" />
              Payment unavailable
            </div>
            <p className="mt-4 text-base font-semibold text-red-600">{error || "Not found"}</p>
            <button
              onClick={() => router.push(`/buyer/property/${propertyId}`)}
              className="mt-6 rounded-2xl bg-[#316249] px-5 py-3 text-sm font-semibold text-white hover:bg-[#274f3a]"
            >
              View Property
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-[#f5f8f6] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                {isPaid ? <CheckCircle2 className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">
                  {isPaid ? "Property Reserved" : "Property Reserved Temporarily"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {isPaid
                    ? "This property is already paid/reserved. You can't pay again."
                    : "This property is reserved by another user. Please try later."}
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push(`/buyer/property/${propertyId}`)}
              className="mt-5 w-full rounded-2xl bg-[#316249] px-5 py-3 text-sm font-semibold text-white hover:bg-[#274f3a]"
            >
              View Property
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f5f8f6] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Secure Checkout</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Complete your advance payment to confirm reservation.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#316249] ring-1 ring-emerald-200">
                <ShieldCheck className="h-4 w-4" /> Secure payment
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="grid gap-0 sm:grid-cols-[190px_1fr]">
                <div className="h-40 w-full bg-slate-100 sm:h-full">
                  <img
                    src={propertyImage}
                    alt={property?.title || "Property"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Verified Listing
                  </div>
                  <h2 className="mt-1 break-words text-lg font-semibold text-slate-900">{property?.title}</h2>
                  <p className="mt-1 break-words text-sm text-slate-600">
                    {property?.address || property?.location || "Location unavailable"}
                  </p>
                  <p className="mt-3 text-base font-semibold text-[#316249]">
                    {currency} {Number(property?.price || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Payment Method</div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setGateway("khalti")}
                  className={[
                    "rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-300",
                    gateway === "khalti"
                      ? "border-[#316249] bg-[#316249] text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:bg-emerald-50",
                  ].join(" ")}
                >
                  <div className="text-sm font-semibold">Khalti</div>
                  <div className="mt-1 text-xs opacity-90">Wallet/Checkout -&gt; Verify on server</div>
                </button>

                <button
                  type="button"
                  onClick={() => setGateway("esewa")}
                  className={[
                    "rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-300",
                    gateway === "esewa"
                      ? "border-[#316249] bg-[#316249] text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:bg-emerald-50",
                  ].join(" ")}
                >
                  <div className="text-sm font-semibold">eSewa</div>
                  <div className="mt-1 text-xs opacity-90">Auto-redirect (form post)</div>
                </button>
              </div>
            </div>

            {isReserved && isMine && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                Reserved by you. Complete payment to confirm.
              </p>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900">Order Summary</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-start justify-between gap-3 text-sm text-slate-600">
                  <span>Advance Amount</span>
                  <span className="font-semibold text-slate-900">
                    {currency} {Number(finalAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">Amount to Pay</span>
                  <span className="break-words text-2xl font-bold text-[#316249]">
                    {currency} {Number(finalAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Reservation auto-expires if payment is not completed within 1 hour.
              </div>

              <div className="mt-4 space-y-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#316249]">
                  <ShieldCheck className="h-4 w-4" />
                  Protected transaction
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#316249]">
                  <CheckCircle2 className="h-4 w-4" />
                  Verified listing
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#316249]">
                  <Lock className="h-4 w-4" />
                  Encrypted checkout
                </div>
              </div>

              <button
                disabled={Number(finalAmount || 0) <= 0 || payLoading}
                className="mt-6 w-full rounded-2xl bg-[#316249] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#274f3a] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={startPayment}
              >
                {payLoading ? "Starting Payment..." : "Proceed to Pay"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

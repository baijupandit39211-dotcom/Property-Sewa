"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
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

        // get me (for reservation ownership)
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

  // ✅ reservation guards
  const reservationStatus = String(property?.reservationStatus || "none").toLowerCase();
  const reservedBy = property?.reservedBy ? String(property.reservedBy) : "";
  const reservedUntil = property?.reservedUntil ? new Date(property.reservedUntil).getTime() : 0;

  const isReserved = reservationStatus === "reserved";
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

      alert(
        `Khalti initiated.\nPaymentId: ${res.paymentId}\n\nNext step: integrate Khalti checkout redirect/popup, then call /payments/khalti/verify with paymentId + pidx/transaction_id`
      );
    } catch (e: any) {
      setError(e?.message || "Payment initiation failed");
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-r-2 border-emerald-600" />
          <p className="mt-4 text-slate-600">Loading payment...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <p className="font-semibold text-red-600">{error || "Not found"}</p>
        </div>
      </div>
    );
  }

  // ✅ Blocked UI
  if (blocked) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-black/5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-slate-100 p-2">
              {isPaid ? <CheckCircle2 className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-lg font-extrabold text-slate-900">
                {isPaid ? "Property Reserved" : "Property Reserved Temporarily"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {isPaid
                  ? "This property is already paid/reserved. You can’t pay again."
                  : "This property is reserved by another user. Please try later."}
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push(`/buyer/property/${propertyId}`)}
            className="mt-5 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-700"
          >
            View Property
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mt-6 overflow-hidden rounded-3xl bg-white ring-1 ring-black/5">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Pay Advance</h1>
              <p className="mt-1 text-sm text-slate-600">
                Property: <span className="font-semibold text-slate-900">{property?.title}</span>
              </p>

              {isReserved && isMine && (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  ⏳ Reserved by you. Complete payment to confirm.
                </p>
              )}
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-200">
              <ShieldCheck className="h-4 w-4" /> Secure
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-500">Advance Amount</div>
            <div className="mt-1 text-3xl font-extrabold text-emerald-700">
              {currency} {Number(finalAmount || 0).toLocaleString()}
            </div>

            <div className="mt-2 text-xs text-slate-500">
              Reservation auto-expires if payment is not completed within 24 hours.
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-extrabold text-slate-900">Choose Gateway</div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setGateway("khalti")}
                className={[
                  "rounded-2xl px-4 py-4 text-left ring-1 transition",
                  gateway === "khalti"
                    ? "bg-emerald-600 text-white ring-emerald-200"
                    : "bg-white text-slate-900 ring-slate-200 hover:bg-emerald-50",
                ].join(" ")}
              >
                <div className="text-sm font-extrabold">Khalti</div>
                <div className="mt-1 text-xs opacity-90">Wallet/Checkout → Verify on server</div>
              </button>

              <button
                type="button"
                onClick={() => setGateway("esewa")}
                className={[
                  "rounded-2xl px-4 py-4 text-left ring-1 transition",
                  gateway === "esewa"
                    ? "bg-emerald-600 text-white ring-emerald-200"
                    : "bg-white text-slate-900 ring-slate-200 hover:bg-emerald-50",
                ].join(" ")}
              >
                <div className="text-sm font-extrabold">eSewa</div>
                <div className="mt-1 text-xs opacity-90">Auto-redirect (form post)</div>
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            disabled={Number(finalAmount || 0) <= 0 || payLoading}
            className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={startPayment}
          >
            {payLoading ? "Starting Payment..." : "Proceed to Pay"}
          </button>
        </div>
      </div>
    </main>
  );
}

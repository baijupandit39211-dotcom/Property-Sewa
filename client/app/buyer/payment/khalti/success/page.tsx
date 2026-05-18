"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

function KhaltiSuccessPageContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const paymentId = useMemo(
    () =>
      String(
        sp.get("purchase_order_id") ||
          sp.get("paymentId") ||
          sp.get("pid") ||
          ""
      ).trim(),
    [sp]
  );
  const pidx = useMemo(() => String(sp.get("pidx") || "").trim(), [sp]);
  const transactionId = useMemo(
    () =>
      String(
        sp.get("transaction_id") || sp.get("transactionId") || ""
      ).trim(),
    [sp]
  );

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyErr, setVerifyErr] = useState("");

  useEffect(() => {
    if (!paymentId || !pidx) return;

    let mounted = true;
    (async () => {
      try {
        setVerifying(true);
        setVerified(false);
        setVerifyErr("");
        setVerifyMsg("");

        const res = await apiFetch<any>("/payments/khalti/verify", {
          method: "POST",
          body: JSON.stringify({
            paymentId,
            pidx,
            transaction_id: transactionId || undefined,
          }),
        });

        if (!mounted) return;
        if (res?.success) {
          setVerified(true);
          setVerifyMsg("Khalti payment verified successfully.");
        } else {
          setVerifyErr(res?.message || "Verification failed.");
        }
      } catch (e: any) {
        if (!mounted) return;
        setVerifyErr(e?.message || "Verification failed.");
      } finally {
        if (!mounted) return;
        setVerifying(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [paymentId, pidx, transactionId]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-black/5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Khalti Payment Success
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Your payment is being verified and reservation will be confirmed.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-slate-500">Payment ID</div>
          <div className="mt-1 break-all text-sm font-bold text-slate-900">
            {paymentId || "-"}
          </div>
          <div className="mt-3 text-xs font-semibold text-slate-500">PIDX</div>
          <div className="mt-1 break-all text-sm font-bold text-slate-900">
            {pidx || "-"}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <div className="text-xs font-extrabold text-slate-900">
              Verification Status
            </div>
          </div>
          <div className="mt-2 text-sm">
            {verifying && (
              <div className="flex items-center gap-2 text-slate-700">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-r-2 border-emerald-600" />
                Verifying Khalti payment with server...
              </div>
            )}
            {!verifying && verified && (
              <div className="font-semibold text-emerald-700">
                Verified & Reserved
                {verifyMsg ? (
                  <div className="mt-1 text-xs font-medium text-slate-600">{verifyMsg}</div>
                ) : null}
              </div>
            )}
            {!verifying && !verified && verifyErr && (
              <div className="font-semibold text-red-600">
                Not Verified
                <div className="mt-1 text-xs font-medium text-slate-600">{verifyErr}</div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => router.push("/buyer/search-properties")}
            className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-700"
          >
            Go to Search Properties
          </button>
          <button
            onClick={() => router.push("/buyer/buyer-dashboard")}
            className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}

export default function KhaltiSuccessPage() {
  return (
    <Suspense fallback={null}>
      <KhaltiSuccessPageContent />
    </Suspense>
  );
}


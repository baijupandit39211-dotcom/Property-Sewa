"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { CheckCircle2, ArrowLeft, ShieldCheck } from "lucide-react";

function safeJsonParse<T = any>(str: string | null): T | null {
  if (!str) return null;
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

function decodeEsewaData(dataParam: string | null) {
  if (!dataParam) return null;

  // 1) JSON directly
  const asJson = safeJsonParse(dataParam);
  if (asJson) return asJson;

  // 2) decodeURIComponent then JSON
  try {
    const decoded = decodeURIComponent(dataParam);
    const asJson2 = safeJsonParse(decoded);
    if (asJson2) return asJson2;
  } catch {
    // ignore
  }

  // 3) base64 -> json (best-effort)
  try {
    const b64 = atob(dataParam);
    return safeJsonParse(b64) || { raw: b64 };
  } catch {
    return { raw: dataParam };
  }
}

/**
 * ✅ IMPORTANT FIX:
 * Sometimes pid becomes: "PAYMENT_ID?data=xxxx" or "PAYMENT_ID&data=xxxx"
 * We must strip anything after ? or &
 */
function cleanPid(raw: string) {
  if (!raw) return "";
  return raw.split("?")[0].split("&")[0].trim();
}

function EsewaSuccessPageContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const pidRaw = sp.get("pid") || ""; // from success_url
  const dataParam = sp.get("data");

  const decodedData = useMemo(() => decodeEsewaData(dataParam), [dataParam]);

  // ✅ always work with a clean payment id
  const paymentId = useMemo(() => {
    // Prefer transaction_uuid if present in decoded data (more reliable)
    const fromData =
      (decodedData as any)?.transaction_uuid ||
      (decodedData as any)?.transactionUuid ||
      "";

    const cleanedPid = cleanPid(pidRaw);

    return String(fromData || cleanedPid || "").trim();
  }, [pidRaw, decodedData]);

  // ✅ verify call states
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyErr, setVerifyErr] = useState("");

  useEffect(() => {
    // ✅ verify only if we have paymentId
    if (!paymentId) return;

    let mounted = true;

    (async () => {
      try {
        setVerifying(true);
        setVerified(false);
        setVerifyErr("");
        setVerifyMsg("");

        // ✅ Call backend verify endpoint
        // Your backend supports:
        // POST /payments/esewa/verify { paymentId } OR { pid }
        const res = await apiFetch<any>("/payments/esewa/verify", {
          method: "POST",
          body: JSON.stringify({
            // ✅ send clean ObjectId
            paymentId,

            // optional debug (backend can ignore)
            data: decodedData ?? null,
          }),
        });

        if (!mounted) return;

        if (res?.success) {
          setVerified(true);
          setVerifyMsg(
            res?.message || "Payment verified successfully. Property reserved."
          );
        } else {
          setVerified(false);
          setVerifyErr(res?.message || "Verification failed.");
        }
      } catch (e: any) {
        if (!mounted) return;
        setVerified(false);
        setVerifyErr(e?.message || "Verification failed.");
      } finally {
        if (!mounted) return;
        setVerifying(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [paymentId, decodedData]);

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
              Payment Success
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Your payment was successful. We’ll confirm and reserve the property.
            </p>
          </div>
        </div>

        {/* pid raw + cleaned */}
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-slate-500">
            Payment ID (clean)
          </div>
          <div className="mt-1 break-all text-sm font-bold text-slate-900">
            {paymentId || "—"}
          </div>

          {/* optional debug */}
          {pidRaw && pidRaw !== paymentId && (
            <div className="mt-2 text-[11px] text-slate-500">
              Raw pid: <span className="break-all">{pidRaw}</span>
            </div>
          )}
        </div>

        {/* verification status */}
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
                Verifying payment with server...
              </div>
            )}

            {!verifying && verified && (
              <div className="font-semibold text-emerald-700">
                ✅ Verified & Reserved
                {verifyMsg ? (
                  <div className="mt-1 text-xs font-medium text-slate-600">
                    {verifyMsg}
                  </div>
                ) : null}
              </div>
            )}

            {!verifying && !verified && verifyErr && (
              <div className="font-semibold text-red-600">
                ❌ Not Verified
                <div className="mt-1 text-xs font-medium text-slate-600">
                  {verifyErr}
                </div>
              </div>
            )}

            {!verifying && !verified && !verifyErr && (
              <div className="text-slate-600">Waiting for verification...</div>
            )}
          </div>
        </div>

        {/* debug data */}
        {decodedData && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-500">
              Gateway Data
            </div>
            <pre className="mt-2 max-h-60 overflow-auto text-xs text-slate-700">
              {JSON.stringify(decodedData, null, 2)}
            </pre>
          </div>
        )}

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

        <p className="mt-4 text-xs text-slate-500">
          This page calls your backend verify endpoint automatically.
        </p>
      </div>
    </main>
  );
}

export default function EsewaSuccessPage() {
  return (
    <Suspense fallback={null}>
      <EsewaSuccessPageContent />
    </Suspense>
  );
}

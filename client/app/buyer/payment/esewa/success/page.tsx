"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowLeft } from "lucide-react";

function safeJsonParse<T = any>(str: string | null): T | null {
  if (!str) return null;
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

export default function EsewaSuccessPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const pid = sp.get("pid") || ""; // you are sending pid in success_url
  const dataParam = sp.get("data"); // eSewa sometimes sends this
  const decodedData = useMemo(() => {
    if (!dataParam) return null;

    // some gateways send urlencoded/base64/json — try common options safely
    // 1) JSON directly
    const asJson = safeJsonParse(dataParam);
    if (asJson) return asJson;

    // 2) decodeURIComponent then JSON
    const decoded = decodeURIComponent(dataParam);
    const asJson2 = safeJsonParse(decoded);
    if (asJson2) return asJson2;

    // 3) base64 -> json (best-effort)
    try {
      const b64 = atob(dataParam);
      return safeJsonParse(b64) || { raw: b64 };
    } catch {
      return { raw: dataParam };
    }
  }, [dataParam]);

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
            <h1 className="text-2xl font-extrabold text-slate-900">Payment Success</h1>
            <p className="mt-1 text-sm text-slate-600">
              Your payment was successful. We’ll confirm and reserve the property.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-slate-500">Payment ID (pid)</div>
          <div className="mt-1 break-all text-sm font-bold text-slate-900">{pid || "—"}</div>
        </div>

        {decodedData && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-500">Gateway Data</div>
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
          Note: This page is UI-only unless you also call your backend verify endpoint.
        </p>
      </div>
    </main>
  );
}

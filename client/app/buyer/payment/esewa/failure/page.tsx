"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { XCircle, ArrowLeft } from "lucide-react";

export default function EsewaFailurePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const pid = sp.get("pid") || "";

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
          <XCircle className="h-7 w-7 text-red-600" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Payment Failed</h1>
            <p className="mt-1 text-sm text-slate-600">
              The payment was cancelled or failed. You can try again.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-slate-500">Payment ID (pid)</div>
          <div className="mt-1 break-all text-sm font-bold text-slate-900">{pid || "—"}</div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => router.push("/buyer/search-properties")}
            className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-700"
          >
            Try Again
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

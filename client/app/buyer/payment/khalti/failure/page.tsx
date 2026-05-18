"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";

function KhaltiFailurePageContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const message =
    sp.get("message") ||
    sp.get("detail") ||
    "Payment was not completed. You can try again.";

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
          <AlertTriangle className="h-7 w-7 text-amber-600" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Khalti Payment Incomplete
            </h1>
            <p className="mt-1 text-sm text-slate-600">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => router.push("/buyer/search-properties")}
            className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-700"
          >
            Browse Properties
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

export default function KhaltiFailurePage() {
  return (
    <Suspense fallback={null}>
      <KhaltiFailurePageContent />
    </Suspense>
  );
}


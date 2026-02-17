"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { ArrowLeft, Loader2, Mail, Phone, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";

type MeResponse = {
  success?: boolean;
  user?: {
    name?: string;
    email?: string;
    role?: string;
    phone?: string;
  };
  message?: string;
};

export default function BuyerProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch<MeResponse>("/auth/me");
        if (res?.success === false || !res?.user) {
          throw new Error(res?.message || "Failed to load profile");
        }
        setData(res.user);
      } catch (e: any) {
        setError(e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Buyer Profile</h1>
            <p className="text-sm text-slate-600">Your account details</p>
          </div>
        </div>

        {loading && (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile...
          </div>
        )}

        {error && !loading && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {data && !loading && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold uppercase text-slate-500">Name</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">
                {data.name || "Not provided"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {data.email || "Not provided"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Shield className="h-4 w-4" />
                Role
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {data.role || "buyer"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Phone className="h-4 w-4" />
                Phone
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {data.phone || "Not provided"}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

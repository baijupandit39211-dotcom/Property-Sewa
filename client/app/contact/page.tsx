import Link from "next/link";
import { Mail, PhoneCall, Clock3, ChevronLeft, Search } from "lucide-react";

const SUPPORT_EMAIL = "support@propertysewa.com";
const SUPPORT_PHONE = "";
const CONTACT_HOURS = "Sun - Fri, 9:00 AM - 6:00 PM";

export default function ContactPage() {
  const hasPhone = SUPPORT_PHONE.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <Link
            href="/properties"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Search className="h-4 w-4" />
            Browse Properties
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="rounded-[32px] bg-[#12392B] px-6 py-10 text-white shadow-sm sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
            Contact Support
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Reach Property Sewa when you need help.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
            For listing questions, account access, and general support, use the
            contact options below. This keeps the homepage call action on a real
            working destination.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Mail className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-900">Email support</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-2 block text-sm text-emerald-700 hover:text-emerald-800"
            >
              {SUPPORT_EMAIL}
            </a>
            <p className="mt-2 text-sm text-slate-500">
              Best for account help, listing questions, and general inquiries.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <PhoneCall className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-900">Call support</p>
            {hasPhone ? (
              <a
                href={`tel:${SUPPORT_PHONE}`}
                className="mt-2 block text-sm text-emerald-700 hover:text-emerald-800"
              >
                {SUPPORT_PHONE}
              </a>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Phone support is not published yet.</p>
            )}
            <p className="mt-2 text-sm text-slate-500">
              Use email for now if a direct public support number is not configured.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Clock3 className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-900">Support hours</p>
            <p className="mt-2 text-sm text-slate-700">{CONTACT_HOURS}</p>
            <p className="mt-2 text-sm text-slate-500">
              Messages sent outside support hours can still be handled by email.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

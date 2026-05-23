"use client";

import { useMemo, useState } from "react";
import { HelpCircle, LifeBuoy, MessageSquare, Search } from "lucide-react";

type HelpTopic = {
  id: string;
  section: "listing" | "leads" | "messages" | "booking" | "profile" | "support";
  q: string;
  a: string;
};

const topics: HelpTopic[] = [
  {
    id: "listing-1",
    section: "listing",
    q: "How do I add a new property listing?",
    a: "Go to Add Property, complete required fields, upload images, and submit. Your listing appears after normal moderation flow.",
  },
  {
    id: "listing-2",
    section: "listing",
    q: "Can I edit a live listing?",
    a: "Yes. Open My Properties, choose a listing, and use Edit. Updates follow the same approval rules already used in your workspace.",
  },
  {
    id: "leads-1",
    section: "leads",
    q: "Where do buyer inquiries appear?",
    a: "Use Leads/Inquiries from the seller sidebar. Each lead includes buyer details, property context, and lead status.",
  },
  {
    id: "messages-1",
    section: "messages",
    q: "How do I reply to buyer messages?",
    a: "Open Messages/Chat, pick the conversation, and send a reply. Delivery and read states continue to work through existing chat flow.",
  },
  {
    id: "booking-1",
    section: "booking",
    q: "How do visit schedules work?",
    a: "Use Visit Scheduling/Calendar to confirm, reschedule, or reject requests. Buyers see updates in their scheduled visit workspace.",
  },
  {
    id: "booking-2",
    section: "booking",
    q: "Where do reservation/payment updates show?",
    a: "Check your seller dashboard notifications and related lead/property records for latest reservation and payment status changes.",
  },
  {
    id: "profile-1",
    section: "profile",
    q: "How can I update my seller profile?",
    a: "Open Profile from seller navigation and update account details. Save to apply changes for your seller identity.",
  },
  {
    id: "support-1",
    section: "support",
    q: "How do I contact support for urgent issues?",
    a: "Use the support card below to email support. Include listing ID, lead ID, and screenshots for faster resolution.",
  },
];

const sectionLabel: Record<HelpTopic["section"], string> = {
  listing: "Property Listing",
  leads: "Leads & Inquiries",
  messages: "Messages & Chat",
  booking: "Payments & Booking",
  profile: "Profile",
  support: "Support",
};

export default function HelpPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(
      (topic) =>
        topic.q.toLowerCase().includes(q) ||
        topic.a.toLowerCase().includes(q) ||
        sectionLabel[topic.section].toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
      <section className="overflow-hidden rounded-[24px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-50">
            Seller support
          </span>
          <h1 className="mt-4 text-3xl font-bold text-white">Help and Docs</h1>
          <p className="mt-3 text-sm text-emerald-50/90">Search seller help topics for listings, leads, chat, visits, profile, and support.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search help topics"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:border-[#316249] focus:ring-2 focus:ring-[#316249]/20"
          />
        </label>
      </section>

      <section className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No help topics matched your search.
          </div>
        ) : (
          filtered.map((topic) => (
            <article key={topic.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#f4fbf7] px-3 py-1 text-xs font-semibold text-[#316249] ring-1 ring-[#316249]/15">
                <HelpCircle className="h-3.5 w-3.5" />
                {sectionLabel[topic.section]}
              </div>
              <h2 className="text-base font-semibold text-slate-900">{topic.q}</h2>
              <p className="mt-2 text-sm text-slate-600">{topic.a}</p>
            </article>
          ))
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Need direct support?</h3>
            <p className="mt-2 text-sm text-slate-600">For account, listing, or workflow issues, contact the support team with exact listing/lead references.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="mailto:support@propertysewa.com" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-[#f4fbf7] hover:text-[#316249]">
              <LifeBuoy className="h-4 w-4" />
              support@propertysewa.com
            </a>
            <a href="/seller/messages" className="inline-flex items-center gap-2 rounded-xl border border-[#316249]/25 bg-white px-4 py-2 text-sm font-medium text-[#244837] hover:bg-[#e9f3ee]">
              <MessageSquare className="h-4 w-4" />
              Open Messages
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
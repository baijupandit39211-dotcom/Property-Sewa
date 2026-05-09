export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
      <section className="overflow-hidden rounded-[34px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50">
            Seller support
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-white">Help and Docs</h1>
          <p className="mt-3 text-sm text-emerald-50/90">Guides and support content for seller workflows.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-gray-600">Coming soon</p>
      </section>
    </main>
  );
}

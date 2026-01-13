export default function AdminOverviewPage() {
  return (
    <div>
      <h1 className="text-4xl font-extrabold text-zinc-900">Overview</h1>
      <p className="mt-2 text-sm text-emerald-700">
        Track overall platform growth and activity trends
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Users", value: "12,345", change: "+12%" },
          { title: "Active Listings", value: "8,765", change: "+8%" },
          { title: "Pending Approvals", value: "123", change: "-5%" },
          { title: "Total Leads/Inquiries", value: "4,567", change: "+15%" },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl bg-emerald-900 p-6 text-white">
            <div className="text-sm text-white/80">{item.title}</div>
            <div className="mt-2 text-3xl font-extrabold">{item.value}</div>
            <div className="mt-2 text-sm text-emerald-400">{item.change}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

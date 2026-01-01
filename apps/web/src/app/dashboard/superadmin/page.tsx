"use client"

export default function SuperAdminDashboardPage() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-3xl font-bold tracking-tight text-[#0f251c]">
          SuperAdmin Overview
        </h2>
        <p className="text-[#2a5c49] mt-2">
          This is a static SuperAdmin dashboard. Use it to visualize how a
          management overview could look, without any live backend data.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
          <p className="text-sm font-medium text-[#2a5c49]">Total Users</p>
          <p className="mt-2 text-2xl font-bold text-[#0f251c]">1,248</p>
          <p className="mt-1 text-xs text-[#2a5c49]">
            Dummy metric for design only
          </p>
        </div>
        <div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
          <p className="text-sm font-medium text-[#2a5c49]">Active Listings</p>
          <p className="mt-2 text-2xl font-bold text-[#0f251c]">312</p>
          <p className="mt-1 text-xs text-[#2a5c49]">
            Static placeholder to show layout
          </p>
        </div>
        <div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
          <p className="text-sm font-medium text-[#2a5c49]">Pending Approvals</p>
          <p className="mt-2 text-2xl font-bold text-[#0f251c]">18</p>
          <p className="mt-1 text-xs text-[#2a5c49]">
            No API calls are made here
          </p>
        </div>
      </section>
    </div>
  )
}


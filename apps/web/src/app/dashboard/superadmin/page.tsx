"use client";

export default function SuperAdminDashboardPage() {
	return (
		<div className="space-y-8">
			<section>
				<h2 className="font-bold text-3xl text-[#0f251c] tracking-tight">
					SuperAdmin Overview
				</h2>
				<p className="mt-2 text-[#2a5c49]">
					This is a static SuperAdmin dashboard. Use it to visualize how a
					management overview could look, without any live backend data.
				</p>
			</section>

			<section className="grid gap-4 md:grid-cols-3">
				<div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
					<p className="font-medium text-[#2a5c49] text-sm">Total Users</p>
					<p className="mt-2 font-bold text-2xl text-[#0f251c]">1,248</p>
					<p className="mt-1 text-[#2a5c49] text-xs">
						Dummy metric for design only
					</p>
				</div>
				<div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
					<p className="font-medium text-[#2a5c49] text-sm">Active Listings</p>
					<p className="mt-2 font-bold text-2xl text-[#0f251c]">312</p>
					<p className="mt-1 text-[#2a5c49] text-xs">
						Static placeholder to show layout
					</p>
				</div>
				<div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
					<p className="font-medium text-[#2a5c49] text-sm">
						Pending Approvals
					</p>
					<p className="mt-2 font-bold text-2xl text-[#0f251c]">18</p>
					<p className="mt-1 text-[#2a5c49] text-xs">
						No API calls are made here
					</p>
				</div>
			</section>
		</div>
	);
}

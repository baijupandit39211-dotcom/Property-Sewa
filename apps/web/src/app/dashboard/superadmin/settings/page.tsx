"use client";

export default function SuperAdminSettingsPage() {
	return (
		<div className="space-y-6">
			<header>
				<h2 className="font-bold text-2xl text-[#0f251c] tracking-tight">
					SuperAdmin Settings
				</h2>
				<p className="mt-1 text-[#2a5c49]">
					Static settings view – wire this up to real APIs later.
				</p>
			</header>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
					<h3 className="font-semibold text-[#0f251c]">Platform controls</h3>
					<p className="mt-2 text-[#2a5c49] text-sm">
						Toggle high-level configuration flags and global limits here once
						backend endpoints are ready.
					</p>
				</div>
				<div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
					<h3 className="font-semibold text-[#0f251c]">
						Notification preferences
					</h3>
					<p className="mt-2 text-[#2a5c49] text-sm">
						This section is purely visual for now – no data is persisted.
					</p>
				</div>
			</div>
		</div>
	);
}

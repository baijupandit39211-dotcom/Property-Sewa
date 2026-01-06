"use client";

export default function SuperAdminUsersPage() {
	return (
		<div className="space-y-6">
			<header>
				<h2 className="font-bold text-2xl text-[#0f251c] tracking-tight">
					Manage Users
				</h2>
				<p className="mt-1 text-[#2a5c49]">
					Static table preview for SuperAdmin. Replace with real data later.
				</p>
			</header>

			<div className="overflow-hidden rounded-xl border border-[#cfe7d6] bg-white">
				<table className="min-w-full text-sm">
					<thead className="bg-[#f4fbf6] text-left font-semibold text-[#2a5c49] text-xs">
						<tr>
							<th className="px-4 py-3">Name</th>
							<th className="px-4 py-3">Email</th>
							<th className="px-4 py-3">Role</th>
							<th className="px-4 py-3">Status</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[#e1efe4]">
						<tr>
							<td className="px-4 py-3">Anya Sharma</td>
							<td className="px-4 py-3">anya@example.com</td>
							<td className="px-4 py-3">Seller</td>
							<td className="px-4 py-3">Active</td>
						</tr>
						<tr>
							<td className="px-4 py-3">Rahul Verma</td>
							<td className="px-4 py-3">rahul@example.com</td>
							<td className="px-4 py-3">Buyer</td>
							<td className="px-4 py-3">Pending</td>
						</tr>
						<tr>
							<td className="px-4 py-3">Admin User</td>
							<td className="px-4 py-3">admin@example.com</td>
							<td className="px-4 py-3">SuperAdmin</td>
							<td className="px-4 py-3">Active</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
	return (
		<div className="mx-auto max-w-2xl space-y-8">
			<div>
				<h1 className="font-bold text-2xl text-[#0f251c]">Account Settings</h1>
				<p className="text-gray-500">Manage your profile and preferences.</p>
			</div>

			<div className="space-y-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
				<div>
					<h2 className="mb-4 font-medium text-[#0f251c] text-lg">
						Profile Information
					</h2>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="firstName">First Name</Label>
							<Input id="firstName" placeholder="Anya" />
						</div>
						<div className="space-y-2">
							<Label htmlFor="lastName">Last Name</Label>
							<Input id="lastName" placeholder="Sharma" />
						</div>
						<div className="space-y-2 md:col-span-2">
							<Label htmlFor="email">Email</Label>
							<Input id="email" type="email" placeholder="anya@example.com" />
						</div>
					</div>
				</div>

				<div className="flex justify-end">
					<Button className="bg-[#13EC80] text-[#0f251c] hover:bg-[#0eb964]">
						Save Changes
					</Button>
				</div>
			</div>
		</div>
	);
}

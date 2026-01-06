"use client";

import { Bell } from "lucide-react";

const notifications = [
	{
		id: 1,
		title: "Price Drop Alert",
		message:
			"The price for 'Modern Apartment in City Center' has dropped by Rs. 10 Lakhs.",
		time: "2 hours ago",
		read: false,
	},
	{
		id: 2,
		title: "New Property Match",
		message:
			"A new property matching your criteria '3 BHK in Lalitpur' is now available.",
		time: "1 day ago",
		read: true,
	},
];

export default function AlertsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-2xl text-[#0f251c]">
					Alerts / Notifications
				</h1>
				<p className="text-gray-500">
					Stay updated with price changes and new listings.
				</p>
			</div>

			<div className="space-y-4">
				{notifications.map((notification) => (
					<div
						key={notification.id}
						className={`rounded-xl border p-4 ${notification.read ? "border-gray-100 bg-white" : "border-[#316249]/20 bg-[#f4fbf6]"} transition-shadow hover:shadow-md`}
					>
						<div className="flex items-start gap-4">
							<div
								className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full ${notification.read ? "bg-gray-100 text-gray-400" : "bg-[#13EC80]/20 text-[#316249]"}`}
							>
								<Bell className="h-4 w-4" />
							</div>
							<div className="flex-1">
								<div className="flex items-start justify-between">
									<h3
										className={`font-medium ${notification.read ? "text-gray-700" : "text-[#0f251c]"}`}
									>
										{notification.title}
									</h3>
									<span className="text-gray-400 text-xs">
										{notification.time}
									</span>
								</div>
								<p className="mt-1 text-gray-600 text-sm">
									{notification.message}
								</p>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

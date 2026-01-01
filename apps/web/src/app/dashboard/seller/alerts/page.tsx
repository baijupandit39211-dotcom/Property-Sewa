"use client"

import { Bell } from "lucide-react"

const notifications = [
    {
        id: 1,
        title: "Price Drop Alert",
        message: "The price for 'Modern Apartment in City Center' has dropped by Rs. 10 Lakhs.",
        time: "2 hours ago",
        read: false,
    },
    {
        id: 2,
        title: "New Property Match",
        message: "A new property matching your criteria '3 BHK in Lalitpur' is now available.",
        time: "1 day ago",
        read: true,
    },
]

export default function AlertsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0f251c]">Alerts / Notifications</h1>
                <p className="text-gray-500">Stay updated with price changes and new listings.</p>
            </div>

            <div className="space-y-4">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={`p-4 rounded-xl border ${notification.read ? 'bg-white border-gray-100' : 'bg-[#f4fbf6] border-[#316249]/20'} hover:shadow-md transition-shadow`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center ${notification.read ? 'bg-gray-100 text-gray-400' : 'bg-[#13EC80]/20 text-[#316249]'}`}>
                                <Bell className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`font-medium ${notification.read ? 'text-gray-700' : 'text-[#0f251c]'}`}>
                                        {notification.title}
                                    </h3>
                                    <span className="text-xs text-gray-400">{notification.time}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

"use client"

import { MessageCircle } from "lucide-react"

export default function MessagesPage() {
    return (
        <div className="h-[calc(100vh-140px)] flex flex-col">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#0f251c]">Messages</h1>
                <p className="text-gray-500">Chat with agents and sellers.</p>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="h-16 w-16 bg-[#f4fbf6] rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="h-8 w-8 text-[#316249]" />
                    </div>
                    <h3 className="text-lg font-medium text-[#0f251c] mb-2">Your inbox is empty</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        Start a conversation with an agent or seller to inquire about properties.
                    </p>
                </div>
            </div>
        </div>
    )
}

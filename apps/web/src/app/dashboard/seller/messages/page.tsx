"use client";

import { MessageCircle } from "lucide-react";

export default function MessagesPage() {
	return (
		<div className="flex h-[calc(100vh-140px)] flex-col">
			<div className="mb-6">
				<h1 className="font-bold text-2xl text-[#0f251c]">Messages</h1>
				<p className="text-gray-500">Chat with agents and sellers.</p>
			</div>

			<div className="flex flex-1 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm">
				<div className="text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4fbf6]">
						<MessageCircle className="h-8 w-8 text-[#316249]" />
					</div>
					<h3 className="mb-2 font-medium text-[#0f251c] text-lg">
						Your inbox is empty
					</h3>
					<p className="mx-auto max-w-sm text-gray-500">
						Start a conversation with an agent or seller to inquire about
						properties.
					</p>
				</div>
			</div>
		</div>
	);
}

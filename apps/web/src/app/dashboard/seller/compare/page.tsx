"use client";

import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ComparePage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-2xl text-[#0f251c]">
					Compare Properties
				</h1>
				<p className="text-gray-500">
					Compare features and prices of your selected properties.
				</p>
			</div>

			<div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-16 text-center shadow-sm">
				<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4fbf6]">
					<Scale className="h-8 w-8 text-[#316249]" />
				</div>
				<h3 className="mb-2 font-medium text-[#0f251c] text-lg">
					No properties to compare
				</h3>
				<p className="mx-auto mb-6 max-w-md text-gray-500">
					Select properties from search results or your wishlist to compare them
					side by side.
				</p>
				<Button className="bg-[#13EC80] text-[#0f251c] hover:bg-[#0eb964]">
					Browse Properties
				</Button>
			</div>
		</div>
	);
}

"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PropertyCard } from "@/components/properties/property-card";
import { Button } from "@/components/ui/button";
import { mockProperties } from "@/lib/data/mock-properties";

type FilterTab = "popular" | "newest" | "price";

export function FeaturedProperties() {
	const [activeTab, setActiveTab] = useState<FilterTab>("popular");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 4;

	const tabs: { value: FilterTab; label: string }[] = [
		{ value: "popular", label: "Popular" },
		{ value: "newest", label: "Newest" },
		{ value: "price", label: "Price" },
	];

	// Sort properties based on active tab
	const sortedProperties = [...mockProperties].sort((a, b) => {
		switch (activeTab) {
			case "newest":
				return (
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
			case "price":
				return b.price - a.price;
			default:
				return 0;
		}
	});

	const displayedProperties = sortedProperties.slice(0, itemsPerPage);
	const totalPages = Math.ceil(mockProperties.length / itemsPerPage);

	return (
		<section className="bg-zinc-50 py-20 md:py-28">
			<div className="container mx-auto max-w-7xl px-4">
				{/* Header with title and View All link */}
				<div className="text-center">
					<h2 className="font-bold text-3xl text-zinc-900 md:text-4xl">
						Featured Properties
					</h2>
					<p className="mt-3 text-zinc-500">
						Handpicked listings from the best locations, just for you.
					</p>
				</div>

				<div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
					<div className="flex gap-2 rounded-full bg-white p-1 shadow-sm">
						{tabs.map((tab) => (
							<button
								key={tab.value}
								onClick={() => setActiveTab(tab.value)}
								className={`rounded-full px-5 py-2 font-medium text-sm transition-colors ${
									activeTab === tab.value
										? "bg-zinc-900 text-white"
										: "text-zinc-600 hover:bg-zinc-100"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>
					<Link
						href="/properties"
						className="flex items-center gap-1 font-medium text-emerald-600 text-sm hover:text-emerald-700"
					>
						View All
						<ArrowRight className="h-4 w-4" />
					</Link>
				</div>

				{/* Property Grid - 4 columns on desktop */}
				<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{displayedProperties.map((property) => (
						<PropertyCard key={property.id} property={property} />
					))}
				</div>

				{/* Pagination - Circular page numbers */}
				<div className="mt-10 flex items-center justify-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						className="h-9 w-9 rounded-full"
						disabled={currentPage === 1}
						onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					{Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(
						(page) => (
							<button
								key={page}
								onClick={() => setCurrentPage(page)}
								className={`flex h-9 w-9 items-center justify-center rounded-full font-medium text-sm transition-colors ${
									currentPage === page
										? "bg-emerald-500 text-white"
										: "text-zinc-600 hover:bg-zinc-200"
								}`}
							>
								{page}
							</button>
						),
					)}
					{totalPages > 3 && (
						<>
							<span className="px-1 text-zinc-400">...</span>
							<button
								onClick={() => setCurrentPage(totalPages)}
								className="flex h-9 w-9 items-center justify-center rounded-full font-medium text-sm text-zinc-600 hover:bg-zinc-200"
							>
								{totalPages}
							</button>
						</>
					)}
					<Button
						variant="ghost"
						size="icon"
						className="h-9 w-9 rounded-full"
						disabled={currentPage === totalPages}
						onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</section>
	);
}
